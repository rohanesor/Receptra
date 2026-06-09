import WebSocket from 'ws';
import { config } from '../config/index.js';

export interface DeepgramStreamOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export class DeepgramStream {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private onTranscript: (text: string, isFinal: boolean) => void;
  private onErrorCb?: (err: Error) => void;
  private onCloseCb?: () => void;
  private isConnected = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(options: DeepgramStreamOptions) {
    this.apiKey = config.deepgram.apiKey;
    this.onTranscript = options.onTranscript;
    this.onErrorCb = options.onError;
    this.onCloseCb = options.onClose;
    this.connect();
  }

  private connect() {
    if (!this.apiKey) {
      const err = new Error('DEEPGRAM_API_KEY is not configured.');
      if (this.onErrorCb) this.onErrorCb(err);
      return;
    }

    // Set up Deepgram Live options:
    // - model=nova-2-phonecall: optimized for 8kHz telephone audio
    // - encoding=mulaw: Twilio media streams send 8kHz mulaw
    // - sample_rate=8000: Twilio's sample rate
    // - channels=1: Mono channel
    // - endpointing=300: wait 300ms of silence before triggering final utterance
    // - interim_results=true: stream real-time guesses before finalized text
    const url = 'wss://api.deepgram.com/v1/listen?model=nova-2-phonecall&encoding=mulaw&sample_rate=8000&channels=1&endpointing=300&interim_results=true';

    console.log('[Deepgram] Connecting to streaming API...');
    
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    this.ws.on('open', () => {
      console.log('[Deepgram] Connection established successfully.');
      this.isConnected = true;
      
      // Start keep-alive pinging (Deepgram expects a keep-alive message to avoid timeouts)
      this.pingInterval = setInterval(() => {
        if (this.ws && this.isConnected) {
          this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 10000);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // Extract transcript
        if (response.channel && response.channel.alternatives) {
          const alternative = response.channel.alternatives[0];
          const transcript = alternative.transcript || '';
          const isFinal = response.is_final || false;
          
          if (transcript.trim().length > 0) {
            this.onTranscript(transcript, isFinal);
          }
        }
      } catch (err) {
        console.error('[Deepgram] Failed to parse message:', err);
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[Deepgram] WebSocket error:', err);
      if (this.onErrorCb) this.onErrorCb(err);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[Deepgram] Connection closed (code: ${code}, reason: ${reason.toString()})`);
      this.isConnected = false;
      this.cleanup();
      if (this.onCloseCb) this.onCloseCb();
    });
  }

  /**
   * Send binary audio chunk to Deepgram
   */
  public sendAudio(chunk: Buffer) {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  /**
   * Close the Deepgram connection
   */
  public close() {
    console.log('[Deepgram] Closing connection...');
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
