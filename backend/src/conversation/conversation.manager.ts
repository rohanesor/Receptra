import WebSocket from 'ws';
import { DeepgramStream } from '../deepgram/deepgram.service.js';
import { ElevenLabsStream } from '../elevenlabs/elevenlabs.service.js';
import { ClaudeService, MessageParam } from '../claude/claude.service.js';
import { checkAvailability, createAppointment, takeMessage, saveCallLog } from '../actions/action.engine.js';

// Global registry of active call managers to broadcast live logs
export const activeCalls = new Map<string, ConversationManager>();

// Active dashboard connections
export const dashboardSockets = new Set<WebSocket>();

export class ConversationManager {
  public callSid: string;
  public customerPhone: string;
  
  private twilioWs: WebSocket;
  private audioStreamSid: string | null = null;

  // AI Pipeline components
  private deepgramStream: DeepgramStream | null = null;
  private elevenLabsStream: ElevenLabsStream | null = null;
  private claudeService: ClaudeService;

  // Call state
  private history: MessageParam[] = [];
  private aiIsSpeaking = false;
  private claudeIsGenerating = false;
  private transcriptLog = '';
  private callStartTime: Date;

  // Interruption trigger
  private currentElevenLabsSession: ElevenLabsStream | null = null;

  constructor(callSid: string, customerPhone: string, twilioWs: WebSocket, streamSid?: string) {
    this.callSid = callSid;
    this.customerPhone = customerPhone;
    this.twilioWs = twilioWs;
    this.audioStreamSid = streamSid || null;
    this.claudeService = new ClaudeService();
    this.callStartTime = new Date();
    
    activeCalls.set(callSid, this);
    this.initPipeline();
  }

  /**
   * Broadcast events to all active dashboard WebSocket clients
   */
  public static broadcastToDashboard(event: string, payload: any) {
    const message = JSON.stringify({ event, payload });
    for (const ws of dashboardSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Initialize speech-to-text, Claude reasoning, and text-to-speech connections
   */
  private initPipeline() {
    console.log(`[ConversationManager] Initializing pipeline for Call: ${this.callSid}`);

    // 1. Initialize Deepgram Streaming STT
    this.deepgramStream = new DeepgramStream({
      onTranscript: (text, isFinal) => this.handleUserTranscript(text, isFinal),
      onError: (err) => console.error(`[Deepgram Stream Error] ${this.callSid}:`, err),
    });

    // 2. Queue an initial welcome greeting from the AI
    // We start the call by greeting the customer.
    setTimeout(() => {
      this.triggerAIResponse('Hello! Welcome to StyleCraft Barber. How can I help you today?');
    }, 1000);

    // Notify dashboards
    ConversationManager.broadcastToDashboard('call_started', {
      callSid: this.callSid,
      customerPhone: this.customerPhone,
      timestamp: this.callStartTime,
    });
  }

  /**
   * Processes incoming audio buffer from Twilio and streams it to Deepgram
   */
  public handleTwilioAudio(base64Payload: string, streamSid: string) {
    this.audioStreamSid = streamSid;
    const buffer = Buffer.from(base64Payload, 'base64');
    if (this.deepgramStream) {
      this.deepgramStream.sendAudio(buffer);
    }
  }

  /**
   * Handles transcription updates from Deepgram
   */
  private handleUserTranscript(text: string, isFinal: boolean) {
    console.log(`[Deepgram Transcript] ${this.callSid} (${isFinal ? 'FINAL' : 'INTERIM'}): ${text}`);

    // If the user starts speaking while the AI is talking, trigger a Barge-In (interruption)
    if (this.aiIsSpeaking || this.claudeIsGenerating) {
      this.handleBargeIn();
    }

    if (isFinal) {
      // Record user speech in history & transcript log
      this.transcriptLog += `Customer: ${text}\n`;
      this.history.push({ role: 'user', content: text });
      
      // Send real-time transcript updates to dashboards
      ConversationManager.broadcastToDashboard('transcript_update', {
        callSid: this.callSid,
        speaker: 'customer',
        text,
      });

      // Query Claude for next action/response
      this.generateAIResponse();
    }
  }

  /**
   * Barge-In: Flushes Twilio buffer, stops current TTS generation, and halts Claude
   */
  private handleBargeIn() {
    console.log(`[Barge-In] Interruption detected on Call: ${this.callSid}. Clearing audio buffers...`);
    
    // 1. Send Twilio clear command to flush its queued speaker buffer
    if (this.audioStreamSid && this.twilioWs.readyState === WebSocket.OPEN) {
      this.twilioWs.send(
        JSON.stringify({
          event: 'clear',
          streamSid: this.audioStreamSid,
        })
      );
    }

    // 2. Shut down the current ElevenLabs connection to halt active audio rendering
    if (this.currentElevenLabsSession) {
      this.currentElevenLabsSession.close();
      this.currentElevenLabsSession = null;
    }

    this.aiIsSpeaking = false;
    this.claudeIsGenerating = false;
    
    console.log(`[Barge-In] AI voice output successfully interrupted.`);
  }

  /**
   * Trigger the AI to speak a predefined line (e.g. welcome greeting)
   */
  private triggerAIResponse(initialText: string) {
    this.transcriptLog += `Agent: ${initialText}\n`;
    this.history.push({ role: 'assistant', content: initialText });

    ConversationManager.broadcastToDashboard('transcript_update', {
      callSid: this.callSid,
      speaker: 'agent',
      text: initialText,
    });

    this.streamTextToVoice(initialText);
  }

  /**
   * Requests text from Claude, streaming it token-by-token directly into ElevenLabs
   */
  private async generateAIResponse() {
    this.claudeIsGenerating = true;
    let accumulatedText = '';

    // Initialize a new ElevenLabs streaming connection for this utterance
    this.currentElevenLabsSession = new ElevenLabsStream({
      onAudio: (base64Audio) => this.sendAudioToTwilio(base64Audio),
      onClose: () => {
        this.aiIsSpeaking = false;
      },
    });

    try {
      await this.claudeService.getStream(this.history, this.customerPhone, {
        onTextToken: (token) => {
          if (!this.claudeIsGenerating) return; // Terminate if interrupted
          
          accumulatedText += token;
          this.aiIsSpeaking = true;

          // Send token directly to ElevenLabs
          this.currentElevenLabsSession?.sendText(token);
        },
        
        onToolUseStart: (id, name) => {
          console.log(`[Claude Tool Start] Call: ${this.callSid} | Tool: ${name}`);
        },

        onToolUseDelta: () => {},

        onToolUseComplete: async (id, name, input) => {
          if (!this.claudeIsGenerating && !id.startsWith('mock_')) return;
          console.log(`[Claude Tool Complete] Call: ${this.callSid} | Executing: ${name}(${JSON.stringify(input)})`);
          
          // Terminate TTS stream before running tool (no audio was generated for tools anyway)
          this.currentElevenLabsSession?.finalize();
          this.claudeIsGenerating = false;

          // Execute tool
          const toolResult = await this.executeTool(name, input);

          // Append tool execution and result to Claude's message history
          this.history.push({
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: id,
                name: name,
                input: input,
              },
            ],
          });

          this.history.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: id,
                content: JSON.stringify(toolResult),
              },
            ],
          });

          // Recursively call Claude with the tool results to get the verbal response
          this.generateAIResponse();
        },
      });

      if (this.claudeIsGenerating && accumulatedText.trim().length > 0) {
        this.claudeIsGenerating = false;
        
        // Finalize speech segment
        this.currentElevenLabsSession?.finalize();
        this.history.push({ role: 'assistant', content: accumulatedText });
        this.transcriptLog += `Agent: ${accumulatedText}\n`;

        ConversationManager.broadcastToDashboard('transcript_update', {
          callSid: this.callSid,
          speaker: 'agent',
          text: accumulatedText,
        });
      }
    } catch (err) {
      console.error(`[Claude Generation Error] Call: ${this.callSid}`, err);
      this.triggerAIResponse("I'm sorry, I'm having trouble connecting right now. Can you please repeat that?");
    }
  }

  /**
   * Stream a finished string to ElevenLabs TTS
   */
  private streamTextToVoice(text: string) {
    this.currentElevenLabsSession = new ElevenLabsStream({
      onAudio: (base64Audio) => this.sendAudioToTwilio(base64Audio),
      onClose: () => {
        this.aiIsSpeaking = false;
      },
    });

    this.currentElevenLabsSession.sendText(text);
    this.currentElevenLabsSession.finalize();
  }

  /**
   * Helper to write raw audio payload to Twilio WebSocket connection
   */
  private sendAudioToTwilio(base64Audio: string) {
    if (this.audioStreamSid && this.twilioWs.readyState === WebSocket.OPEN) {
      const audioMessage = {
        event: 'media',
        streamSid: this.audioStreamSid,
        media: {
          payload: base64Audio,
        },
      };
      this.twilioWs.send(JSON.stringify(audioMessage));
    }
  }

  /**
   * Router to execute business logic tools and query SQLite databases
   */
  private async executeTool(name: string, input: any): Promise<any> {
    try {
      if (name === 'check_availability') {
        return await checkAvailability(input.date);
      } else if (name === 'create_appointment') {
        const result = await createAppointment(
          input.customerName,
          input.customerPhone,
          input.serviceId,
          input.startTime
        );
        if (result.success && result.appointment) {
          ConversationManager.broadcastToDashboard('appointment_created', result.appointment);
        }
        return result;
      } else if (name === 'take_message') {
        const result = await takeMessage(input.customerName, input.customerPhone, input.reason);
        if (result.success) {
          ConversationManager.broadcastToDashboard('message_created', {
            id: Math.random().toString(36).substring(2, 9),
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            reason: input.reason,
            createdAt: new Date().toISOString(),
          });
        }
        return result;
      }
      return { success: false, message: `Tool ${name} not found.` };
    } catch (err: any) {
      console.error(`[Action Engine Exec Error] Tool: ${name}`, err);
      return { success: false, message: err.message || 'Tool execution failed.' };
    }
  }

  /**
   * Clean up connections on call teardown and save metrics to database
   */
  public async terminateCall() {
    console.log(`[ConversationManager] Teardown call session: ${this.callSid}`);

    // Close sockets
    if (this.deepgramStream) this.deepgramStream.close();
    if (this.currentElevenLabsSession) this.currentElevenLabsSession.close();

    const callDurationSeconds = Math.round((new Date().getTime() - this.callStartTime.getTime()) / 1000);

    // Save call log to DB
    const intent = this.detectPrimaryIntent();
    const summary = await this.summarizeCall();

    await saveCallLog(
      this.customerPhone,
      this.transcriptLog,
      intent,
      callDurationSeconds,
      summary
    ).catch(console.error);

    // Notify dashboards
    ConversationManager.broadcastToDashboard('call_ended', {
      callSid: this.callSid,
      duration: callDurationSeconds,
      intent,
      summary,
    });

    activeCalls.delete(this.callSid);
  }

  private detectPrimaryIntent(): string {
    const text = this.transcriptLog.toLowerCase();
    if (text.includes('create_appointment') || text.includes('booking')) return 'booking';
    if (text.includes('take_message') || text.includes('message')) return 'message';
    return 'inquiry';
  }

  private async summarizeCall(): Promise<string> {
    // Generate simple local summary based on history
    if (this.transcriptLog.includes('create_appointment')) {
      return 'Customer successfully booked an appointment.';
    }
    if (this.transcriptLog.includes('take_message')) {
      return 'Customer left a message for a callback request.';
    }
    return 'Customer called to inquire about services/hours.';
  }
}
