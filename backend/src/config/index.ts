import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim()),
  databaseUrl: process.env.DATABASE_URL || '',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Default voice
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
};

// Simple configuration health check
export function validateConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  
  if (config.nodeEnv === 'production') {
    if (!config.anthropic.apiKey) missing.push('ANTHROPIC_API_KEY');
    if (!config.deepgram.apiKey) missing.push('DEEPGRAM_API_KEY');
    if (!config.elevenlabs.apiKey) missing.push('ELEVENLABS_API_KEY');
  }

  if (missing.length > 0) {
    console.warn(`[Config Warning] Missing required environment variables in ${config.nodeEnv} mode: ${missing.join(', ')}`);
  }
}
