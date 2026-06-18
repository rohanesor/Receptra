# Receptra Architecture

Frontend
- React
- Vite
- Tailwind

Backend
- Node.js
- TypeScript
- Express

Database
- PostgreSQL

Voice Pipeline
Twilio
→ Deepgram
→ Claude
→ ElevenLabs

Architecture Rules

- Controllers are thin
- Services contain business logic
- Database access through repositories
- No direct DB calls from controllers
- No business logic inside React components