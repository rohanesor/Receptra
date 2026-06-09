# RingDesk AI (AI Receptionist for Barbershops)

RingDesk AI is a production-minded AI voice receptionist built for barbershops. It picks up incoming phone calls, conducts natural voice conversations with customers, books appointments, answers business FAQs, takes callback messages, and synchronizes live rolling transcripts to an elegant owner dashboard.

## System Architecture

```
Caller ◄── (Audio Output Stream) ──┐
  │                                │
  ▼ (Call PSTN)                    │
[Twilio Phone Number]              │
  │                                │
  ▼ (TwiML Webhook & Stream)       │
[Express WebSocket Server] ────────┼───────► [Dashboard Live View] (Real-time Sync)
  │                                │
  ├── (Binary u-law Buffer) ──────► [Deepgram Streaming STT]
  │                                        │ (Utterance Transcripts)
  ├── (Tool Call Actions) ◄─────── [Claude Reasoning Engine]
  │                                        │ (Concise Spoken Text)
  └── (Text Stream Tokens) ───────► [ElevenLabs Streaming TTS]
```

---

## Folder Layout

```
ringdesk/
├── package.json              # Monorepo workspaces coordinator
├── docker-compose.yml        # PostgreSQL container configuration
├── backend/
│   ├── src/
│   │   ├── server.ts         # Main server & WebSocket routers
│   │   ├── config/           # Safe environment variable parsing
│   │   ├── database/         # Prisma Client singleton
│   │   ├── twilio/           # Twilio media helpers
│   │   ├── deepgram/         # Live STT WebSocket stream connection
│   │   ├── elevenlabs/       # Live Multilingual v2 TTS stream connection
│   │   ├── claude/           # Claude Model dynamic prompt & streaming logic
│   │   ├── conversation/     # Per-call state coordinator (interruption & transcripts)
│   │   ├── actions/          # System tools (booking, messages, sms, call-logs)
│   │   └── utils/            # Testing scripts
│   ├── prisma/
│   │   ├── schema.prisma     # SQLite/Postgres ORM models
│   │   └── seed.ts           # Standard services seeding script
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx           # WebSocket dashboard sync state
    │   ├── main.tsx          # React renderer
    │   ├── index.css         # Glassmorphism & custom tailwind styling
    │   ├── components/       # Layout, LiveCalls, Appointments, History, Messages
    │   └── services/         # Axios REST API & WebSocket clients
    └── package.json
```

---

## Quick Start (Local Setup)

### Prerequisites
- Node.js (v18+)
- NPM (v9+)
- API Keys: Deepgram, ElevenLabs, and Anthropic Claude

### 1. Monorepo Bootstrapping
Clone or navigate to the repository and run bootstrap in the root:
```bash
npm install
```

### 2. Backend Configuration
Navigate to the `backend/` directory, copy the example environment template, and insert your API credentials:
```bash
cd backend
cp .env.example .env
```
Ensure you fill in `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, and `ELEVENLABS_API_KEY`. 
*(Note: A local SQLite database `dev.db` is configured by default for zero-setup local development).*

### 3. Database Initialization
Generate the Prisma client, run the migrations to create the database schema, and seed the default services:
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Start Development Servers

To run the backend in hot-reload mode:
```bash
# From the backend/ directory
npm run dev
```

To run the frontend dashboard:
```bash
# Open a new terminal from the frontend/ directory
npm install
npm run dev
```
The dashboard will open at [http://localhost:5173](http://localhost:5173).

---

## Local Testing (No Twilio Fees Required)

We have built a custom terminal simulator so you can test the entire conversation flow, Claude tool calling, database updates, and ElevenLabs speech generation without needing actual phone numbers.

1. Ensure the **Backend Server** is running on port `5000`.
2. In a separate terminal inside the `backend/` folder, run:
```bash
npx tsx src/utils/test-websocket.ts
```
3. Type messages in the console (e.g., *"I need a haircut tomorrow at 5 PM"*).
4. Watch the terminal logs:
   - Claude will identify the intent and query slots.
   - Claude will call tools and insert bookings in your SQLite `dev.db`.
   - The console will print audio speaker icons `🔊` as ElevenLabs streams raw voice bytes back.
   - Open your dashboard at `http://localhost:5173` to watch the conversation logs and booking lists update in real-time.

---

## Production Deployment

### Database (PostgreSQL)
When moving to production (Phase 2/3), swap the database provider to PostgreSQL in `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
Run `npx prisma db push` targeting your production PostgreSQL hosting (e.g. AWS RDS or Railway pg).

### Backend (Railway / AWS)
- Deploy the `backend/` directory.
- Configure port bindings and environment variables (`DATABASE_URL`, `ANTHROPIC_API_KEY`, etc.).
- Set up your Twilio Phone Number webhook to call `https://your-backend-domain.com/twilio/voice`.

### Frontend (Vercel)
- Deploy the `frontend/` directory.
- Set `VITE_API_URL` to point to `https://your-backend-domain.com/api/v1`.
