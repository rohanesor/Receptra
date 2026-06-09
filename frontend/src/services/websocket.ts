const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api/v1';

// Convert HTTP(S) URL to WS(S) URL
const WS_BASE = API_BASE.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/api/v1/live-calls');

export interface WSMessage {
  event: 'call_started' | 'transcript_update' | 'call_ended';
  payload: any;
}

/**
 * Open a live WebSocket connection to stream receptionist call events
 */
export function connectLiveCalls(onMessage: (msg: WSMessage) => void): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimeout: any = null;
  let isClosedIntentional = false;

  function establishConnection() {
    console.log(`[Dashboard WS] Connecting to ${WS_BASE}...`);
    ws = new WebSocket(WS_BASE);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        onMessage(msg);
      } catch (err) {
        console.error('[Dashboard WS] Failed to parse message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log(`[Dashboard WS] Connection closed (code: ${event.code})`);
      ws = null;
      if (!isClosedIntentional) {
        console.log('[Dashboard WS] Reconnecting in 3 seconds...');
        reconnectTimeout = setTimeout(establishConnection, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('[Dashboard WS] Error:', err);
    };
  }

  establishConnection();

  // Return a cleanup function
  return () => {
    isClosedIntentional = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) {
      ws.close();
      ws = null;
    }
  };
}
