import WebSocket from 'ws';
import { config } from '../config/index.js';

export interface ElevenLabsStreamOptions {
  onAudio: (base64Audio: string) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export class ElevenLabsStream {
  private ws: WebSocket | null = null;
  private voiceId: string;
  private apiKey: string;
  private onAudio: (base64Audio: string) => void;
  private onErrorCb?: (err: Error) => void;
  private onCloseCb?: () => void;
  private isConnected = false;
  private textBuffer: string[] = [];

  constructor(options: ElevenLabsStreamOptions) {
    this.voiceId = config.elevenlabs.voiceId;
    this.apiKey = config.elevenlabs.apiKey;
    this.onAudio = options.onAudio;
    this.onErrorCb = options.onError;
    this.onCloseCb = options.onClose;
    this.connect();
  }

  private connect() {
    if (!this.apiKey) {
      const err = new Error('ELEVENLABS_API_KEY is not configured.');
      if (this.onErrorCb) this.onErrorCb(err);
      return;
    }

    // ElevenLabs streaming TTS WebSocket endpoint:
    // - voiceId: the specific speaker voice configuration
    // - model_id=eleven_multilingual_v2: supports English, Tamil, and Hindi
    // - output_format=ulaw_8000: Twilio expects 8kHz mu-law, so we pull it directly
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=eleven_multilingual_v2&output_format=ulaw_8000`;

    console.log('[ElevenLabs] Connecting to streaming API...');

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[ElevenLabs] Connection established.');
      this.isConnected = true;

      // Send initial authorization and voice settings
      const initMessage = {
        text: ' ',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.85,
        },
        xi_api_key: this.apiKey,
      };
      
      this.ws?.send(JSON.stringify(initMessage));

      // Flush any text that was sent before connection opened
      while (this.textBuffer.length > 0) {
        const text = this.textBuffer.shift();
        if (text !== undefined) {
          this.sendTextInternal(text);
        }
      }
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());
        
        if (response.audio) {
          // Send base64-encoded mulaw audio directly to callback
          this.onAudio(response.audio);
        }
      } catch (err) {
        console.error('[ElevenLabs] Failed to parse message:', err);
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[ElevenLabs] WebSocket error:', err);
      if (this.onErrorCb) this.onErrorCb(err);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[ElevenLabs] Connection closed (code: ${code}, reason: ${reason.toString()})`);
      this.isConnected = false;
      if (this.onCloseCb) this.onCloseCb();
    });
  }

  /**
   * Stream a chunk of text to ElevenLabs
   */
  public sendText(text: string) {
    if (!text || text.trim() === '') return;

    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.sendTextInternal(text);
    } else {
      // Buffer text if connection is still opening
      this.textBuffer.push(text);
    }
  }

  private sendTextInternal(text: string) {
    const textMessage = {
      text: text,
      try_trigger_generation: true,
    };
    this.ws?.send(JSON.stringify(textMessage));
  }

  /**
   * Finalize the text stream (forces generation of remaining buffered text)
   */
  public finalize() {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      const endMessage = {
        text: '',
      };
      this.ws.send(JSON.stringify(endMessage));
    }
  }

  /**
   * Close the ElevenLabs connection
   */
  public close() {
    console.log('[ElevenLabs] Closing connection...');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
