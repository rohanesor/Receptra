import WebSocket from 'ws';
import readline from 'readline';

const PORT = 5000;
const URL = `ws://localhost:${PORT}/api/v1/twilio/stream`;

console.log(`===================================================`);
console.log(`🎙️  RingDesk AI — Local Voice Receptionist Simulator`);
console.log(`===================================================`);
console.log(`Connecting to server at: ${URL}...`);

const ws = new WebSocket(URL);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

ws.on('open', () => {
  console.log('✅ Connected to receptionist stream.');
  
  // 1. Send Twilio mock start message
  const startEvent = {
    event: 'start',
    sequenceNumber: '1',
    start: {
      accountSid: 'AC_mock_account',
      streamSid: 'MZ_mock_stream_999',
      callSid: 'CA_mock_call_777',
      tracks: ['inbound'],
      mediaFormat: {
        encoding: 'audio/x-mulaw',
        sampleRate: 8000,
        channels: 1,
      },
    },
    streamSid: 'MZ_mock_stream_999',
  };

  ws.send(JSON.stringify(startEvent));
  console.log('📞 Session started. Type your message below:');
  console.log('---------------------------------------------------');
  
  promptUser();
});

ws.on('message', (msg: string) => {
  try {
    const data = JSON.parse(msg);
    if (data.event === 'media') {
      // Print indicator when server streams voice audio packets
      process.stdout.write('🔊');
    } else if (data.event === 'clear') {
      console.log('\n[Server Indicator] ⏹️ Audio stream interrupted (User Barge-In).');
    }
  } catch (err) {
    // If raw text or buffer
  }
});

ws.on('close', () => {
  console.log('\n❌ Connection closed by server.');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('\n🚨 WebSocket error:', err.message);
  process.exit(1);
});

function promptUser() {
  rl.question('\nYou: ', (text) => {
    if (text.trim().toLowerCase() === 'exit') {
      ws.close();
      process.exit(0);
    }

    const speechEvent = {
      event: 'mock_speech',
      text: text,
    };
    
    ws.send(JSON.stringify(speechEvent));
    promptUser();
  });
}
