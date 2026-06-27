import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { prisma } from '../database/client.js';
import { DateTime } from 'luxon';

const BUSINESS_TIMEZONE = 'Asia/Kolkata';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey || 'mock_key',
});

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string | any[];
}

/**
 * Dynamically queries the services from the database and constructs the system prompt
 */
export async function getSystemPrompt(customerPhone: string): Promise<string> {
  const services = await prisma.service.findMany();
  const servicesList = services
    .map((s) => `- ${s.name}: Price $${s.price}, Duration ${s.durationMinutes} minutes (Service ID: ${s.id})`)
    .join('\n');

  const now = DateTime.now().setZone(BUSINESS_TIMEZONE);
  
  return `You are "StyleCraft Barber AI Receptionist", a professional, friendly, and extremely concise voice assistant for a premium barbershop.
Your goal is to answer questions and politely guide the caller to book an appointment.

SHOP CONFIGURATION:
- Name: StyleCraft Barber
- Location: 123 Grooming Street, City Centre
- Business Hours: 9:00 AM - 8:00 PM (Monday to Sunday)
- Timezone: ${BUSINESS_TIMEZONE}
- Current Time: ${now.toFormat('dd LLL yyyy, hh:mm a')} (Today is ${now.weekdayLong})

SERVICES OFFERED:
${servicesList}

VOICE CHANNEL RULES:
1. Be extremely brief and natural (1-2 sentences). Never speak lists or paragraphs.
2. If the user mentions a service, match it to one of the services above.
3. Detect the caller's language. If they speak in Tamil, respond in Tamil. If in Hindi, respond in Hindi. If in English, respond in English. Always match and speak the language of the caller.
4. Avoid markdown formatting like asterisks (*), hashtags (#), or lists in your spoken text. Say words instead of symbols.
5. Do NOT invent dates or times. If you check availability and slots are available, list 2-3 options.
6. The user might say "tomorrow", "next Friday", etc. Today is ${now.weekdayLong}, ${now.toFormat('yyyy-MM-dd')}. Use this to calculate target dates.

CALL CONTEXT:
- Caller Phone Number: ${customerPhone} (You MUST use this phone number directly when invoking 'create_appointment' or 'take_message' tools. Do NOT ask the customer to verbally speak their phone number.)

APPOINTMENT BOOKING PROCESS:
1. Ask what service they want.
2. Ask what date and time they prefer.
3. Call "check_availability" first with the target date (YYYY-MM-DD) to see if slots exist.
4. If the slot they want is free, ask for their name, and book using "create_appointment" passing their name, the caller's phone number (${customerPhone}), service ID, and start time in ISO format (e.g. ${now.toFormat('yyyy-MM-dd')}T14:30:00+05:30).
5. If they ask about something you don't know, or want to speak with a human, offer to take a callback message using "take_message".

Remember: Keep responses to less than 25 words unless listing available slots. Speak like a real human receptionist.`;
}

/**
 * Schema definitions for tools Claude can call
 */
export const CLAUDE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: 'Query available booking time slots for a specific date, optionally matching a specific service duration.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to query in YYYY-MM-DD format.',
        },
        serviceId: {
          type: 'string',
          description: 'The UUID service ID of the service the customer wants to check (optional).',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Book a new appointment slot for a service.',
    input_schema: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          description: "The customer's name.",
        },
        customerPhone: {
          type: 'string',
          description: "The customer's phone number.",
        },
        serviceId: {
          type: 'string',
          description: 'The UUID service ID of the selected service.',
        },
        startTime: {
          type: 'string',
          description: 'ISO 8601 formatted start time (e.g. 2026-06-10T11:30:00+05:30).',
        },
      },
      required: ['customerName', 'customerPhone', 'serviceId', 'startTime'],
    },
  },
  {
    name: 'take_message',
    description: 'Take a message from a customer to request a callback or leave general feedback.',
    input_schema: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          description: 'Name of the customer.',
        },
        customerPhone: {
          type: 'string',
          description: 'Callback phone number.',
        },
        reason: {
          type: 'string',
          description: 'The reason for callback or detail of the message.',
        },
      },
      required: ['customerName', 'customerPhone', 'reason'],
    },
  },
];

interface ClaudeStreamCallbacks {
  onTextToken: (token: string) => void;
  onToolUseStart: (id: string, name: string) => void;
  onToolUseDelta: (partialJson: string) => void;
  onToolUseComplete: (id: string, name: string, input: any) => void;
}

export class ClaudeService {
  /**
   * Send a streaming request to Claude, parsing text tokens and tool calls.
   * If the API fails, it automatically falls back to an interactive simulator.
   */
  public async getStream(
    history: MessageParam[],
    customerPhone: string,
    callbacks: ClaudeStreamCallbacks
  ): Promise<void> {
    const systemPrompt = await getSystemPrompt(customerPhone);

    // Check if key is placeholder
    const isPlaceholder = !config.anthropic.apiKey || 
                          config.anthropic.apiKey.startsWith('your_') || 
                          config.anthropic.apiKey === 'mock_key';

    if (isPlaceholder) {
      console.log('[Claude Service] Running in simulation mode (API key is placeholder).');
      await this.runSimulation(history, customerPhone, callbacks);
      return;
    }

    try {
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: history,
        tools: CLAUDE_TOOLS,
        stream: true,
      });

      let currentToolId = '';
      let currentToolName = '';
      let currentToolInputStr = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_start') {
          if (chunk.content_block.type === 'tool_use') {
            currentToolId = chunk.content_block.id;
            currentToolName = chunk.content_block.name;
            currentToolInputStr = '';
            callbacks.onToolUseStart(currentToolId, currentToolName);
          }
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            callbacks.onTextToken(chunk.delta.text);
          } else if (chunk.delta.type === 'input_json_delta') {
            currentToolInputStr += chunk.delta.partial_json;
            callbacks.onToolUseDelta(chunk.delta.partial_json);
          }
        } else if (chunk.type === 'content_block_stop') {
          if (currentToolId) {
            try {
              const inputObj = JSON.parse(currentToolInputStr);
              callbacks.onToolUseComplete(currentToolId, currentToolName, inputObj);
            } catch (jsonErr) {
              console.error('[Claude Service] Failed to parse tool input JSON:', currentToolInputStr, jsonErr);
              callbacks.onToolUseComplete(currentToolId, currentToolName, {});
            }
            currentToolId = '';
            currentToolName = '';
            currentToolInputStr = '';
          }
        }
      }
    } catch (error) {
      console.warn('[Claude Service] Anthropic API failed (likely billing/access limit). Falling back to Simulation Mode.', error);
      await this.runSimulation(history, customerPhone, callbacks);
    }
  }

  /**
   * Safe interactive simulation fallback to guide developers through tool runs
   */
  private async runSimulation(
    history: MessageParam[],
    customerPhone: string,
    callbacks: ClaudeStreamCallbacks
  ): Promise<void> {
    const lastUserMsg = history[history.length - 1]?.content;
    const userText = typeof lastUserMsg === 'string' ? lastUserMsg.toLowerCase() : '';
    let responseText = "Sure! I can help you with bookings or FAQs. What service are you looking for today?";

    // Prioritize booking confirmation block if we have a names/confirmation context
    if (userText.trim().length > 0 && history.length >= 5) {
      const services = await prisma.service.findMany();
      const service = services.find(s => s.name.toLowerCase().includes('haircut')) || services[0];
      
      // Extract name from "my name is X" or similar, or default to capitalization of input
      let name = userText.replace(/^(yes please|my name is|i am|this is|name is)\s+/i, '').trim();
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (!name) name = 'Customer';

      responseText = `Awesome! I have booked a ${service.name} for you, ${name}. You will receive a text confirmation shortly. See you tomorrow!`;
      
      // Stream text response
      for (const word of responseText.split(' ')) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        callbacks.onTextToken(word + ' ');
      }

      // Fire mock tool execution to update DB
      const tomorrowStr = DateTime.now().plus({ days: 1 }).toFormat('yyyy-MM-dd');
      setTimeout(() => {
        callbacks.onToolUseComplete('mock_tool_id', 'create_appointment', {
          customerName: name,
          customerPhone: customerPhone,
          serviceId: service.id,
          startTime: `${tomorrowStr}T10:00:00+05:30`
        });
      }, 1500);
      return;
    } else if (userText.includes('haircut') || userText.includes('beard') || userText.includes('facial')) {
      const services = await prisma.service.findMany();
      const haircut = services.find(s => s.name.toLowerCase().includes('haircut')) || services[0];
      
      responseText = `Great! A ${haircut.name} is $${haircut.price} and takes ${haircut.durationMinutes} minutes. We have slots available tomorrow at 10:00 AM and 2:30 PM. What time works for you?`;
    } else if (userText.includes('10') || userText.includes('2:30') || userText.includes('tomorrow') || /\bpm\b/i.test(userText) || /\bam\b/i.test(userText)) {
      responseText = "Perfect, I can book that slot. Can I please have your name to confirm the appointment?";
    }

    // Stream text response
    for (const word of responseText.split(' ')) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      callbacks.onTextToken(word + ' ');
    }
  }

  /**
   * Generates a high-quality call summary and classifies the caller's primary intent.
   * Uses Claude 3.5 Haiku if API key is valid; otherwise falls back to basic heuristics.
   */
  public async summarizeCall(transcript: string): Promise<{ summary: string; intent: string }> {
    const isPlaceholder = !config.anthropic.apiKey || 
                          config.anthropic.apiKey.startsWith('your_') || 
                          config.anthropic.apiKey === 'mock_key';

    if (isPlaceholder || !transcript.trim()) {
      return this.fallbackSummarize(transcript);
    }

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        system: `You are an expert receptionist assistant. Analyze the following telephone call transcript.
Output a JSON object with two fields:
- "summary": A concise one-sentence summary of the conversation.
- "intent": The primary purpose/intent of the call. Choose exactly one of: "booking", "message", "inquiry", or "unknown".
Do not output any markdown formatting, XML tags, or conversational text. Output raw JSON only.`,
        messages: [{ role: 'user', content: `Transcript:\n${transcript}` }],
      });

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('')
        .trim();

      const parsed = JSON.parse(text);
      return {
        summary: parsed.summary || 'No summary available.',
        intent: parsed.intent || 'unknown'
      };
    } catch (err) {
      console.warn('[Claude Service] LLM call summarization failed. Using fallback:', err);
      return this.fallbackSummarize(transcript);
    }
  }

  private fallbackSummarize(transcript: string): { summary: string; intent: string } {
    const text = transcript.toLowerCase();
    let intent = 'inquiry';
    let summary = 'Customer called to inquire about services/hours.';

    if (text.includes('create_appointment') || text.includes('booked') || text.includes('booking')) {
      intent = 'booking';
      summary = 'Customer successfully booked an appointment.';
    } else if (text.includes('take_message') || text.includes('message') || text.includes('callback')) {
      intent = 'message';
      summary = 'Customer left a message for a callback request.';
    }

    return { summary, intent };
  }
}
