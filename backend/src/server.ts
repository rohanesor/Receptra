import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { config, validateConfig } from './config/index.js';
import routes from './routes/index.js';
import { prisma } from './database/client.js';
import { ConversationManager, activeCalls, dashboardSockets } from './conversation/conversation.manager.js';
import twilio from 'twilio';

// Validate settings at startup
validateConfig();

const app = express();
app.enable('trust proxy');
const server = http.createServer(app);

// Enable WebSocket support on Express
const wsInstance = expressWs(app, server);
const { app: wssApp } = wsInstance;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(
  helmet({
    contentSecurityPolicy: false, // Turn off CSP during development if it interferes with client connections
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API Base Route
app.use('/api/v1', routes);

// Memory map to match Twilio HTTP Webhook details to WebSocket connections
const pendingCalls = new Map<string, string>();

// Twilio Signature Validation Middleware
const twilioSignatureValidator = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isProd = config.nodeEnv === 'production';
  const hasAuthToken = !!config.twilio.authToken;

  if (isProd || hasAuthToken) {
    if (!hasAuthToken) {
      console.error('[Twilio Webhook] Validation failed: TWILIO_AUTH_TOKEN is not set in production.');
      return res.status(500).send('Configuration Error: TWILIO_AUTH_TOKEN missing.');
    }
    
    // Ensure process.env.TWILIO_AUTH_TOKEN is populated for twilio.webhook()
    if (!process.env.TWILIO_AUTH_TOKEN && config.twilio.authToken) {
      process.env.TWILIO_AUTH_TOKEN = config.twilio.authToken;
    }

    return twilio.webhook({ validate: true })(req, res, next);
  } else {
    console.log('[Twilio Webhook Warning] Skipping signature validation in development mode without Auth Token.');
    return next();
  }
};

// TwiML Entrypoint for incoming calls
app.post('/twilio/voice', twilioSignatureValidator, (req, res) => {
  const callSid = req.body.CallSid || '';
  const from = req.body.From || 'Unknown Caller';
  
  if (callSid) {
    pendingCalls.set(callSid, from);
    console.log(`[Twilio Webhook] Received call ${callSid} from ${from}. Caching number.`);
  }

  // Robust check for secure protocol (wss:// vs ws://)
  const isSecure = 
    req.secure || 
    req.headers['x-forwarded-proto'] === 'https' ||
    (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto'].split(',')[0].trim() === 'https') ||
    req.headers['x-forwarded-ssl'] === 'on' ||
    req.headers['x-url-scheme'] === 'https';

  const protocol = isSecure ? 'wss' : 'ws';
  
  let host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.port}`;
  if (typeof host === 'string' && host.includes(',')) {
    host = host.split(',')[0].trim();
  }
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">Hello! Welcome to StyleCraft Barber. Connecting you to our receptionist.</Say>
  <Connect>
    <Stream url="${protocol}://${host}/api/v1/twilio/stream" />
  </Connect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Websocket route for Twilio Media Stream
wssApp.ws('/api/v1/twilio/stream', (ws, req) => {
  console.log('[Twilio WS] Connection opened');
  let manager: ConversationManager | null = null;
  
  ws.on('message', async (msg: string) => {
    try {
      const data = JSON.parse(msg);
      
      if (data.event === 'start') {
        const callSid = data.start.callSid;
        const streamSid = data.start.streamSid || data.streamSid;
        const customerPhone = pendingCalls.get(callSid) || 'Unknown Caller';
        pendingCalls.delete(callSid); // Clean up cache
        
        console.log(`[Twilio WS] Initializing manager for call ${callSid} (${customerPhone})`);
        manager = new ConversationManager(callSid, customerPhone, ws, streamSid);
      } else if (data.event === 'media') {
        if (manager) {
          manager.handleTwilioAudio(data.media.payload, data.streamSid);
        }
      } else if (data.event === 'mock_speech') {
        if (manager) {
          // Bypass STT and push raw text directly into the conversation loop
          (manager as any).handleUserTranscript(data.text, true);
        }
      } else if (data.event === 'stop') {
        console.log('[Twilio WS] Call stopped event received');
        if (manager) {
          await manager.terminateCall();
          manager = null;
        }
      }
    } catch (err) {
      console.error('[Twilio WS] Message processing error:', err);
    }
  });

  ws.on('close', async () => {
    console.log('[Twilio WS] Connection closed');
    if (manager) {
      await manager.terminateCall();
      manager = null;
    }
  });
});

// Websocket route for Dashboard Live Calls
wssApp.ws('/api/v1/live-calls', (ws, req) => {
  console.log('[Dashboard WS] Client connected');
  dashboardSockets.add(ws);
  
  ws.on('close', () => {
    console.log('[Dashboard WS] Client disconnected');
    dashboardSockets.delete(ws);
  });
});

// Database check and server startup
async function startServer() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connected successfully.');

    server.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`🚀 Receptra Backend running on port ${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   API Endpoint: http://localhost:${config.port}/api/v1`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Fatal: Database connection failed during startup.', error);
    process.exit(1);
  }
}

startServer();
export { wsInstance };
