# AI City Mayor

Hackathon proposal for a short, playful 3D game that teaches prompt design through visible civic repairs.

Player arrives as new Mayor of a whimsical modern City. Previous mayor's vague orders produced comic Prompt Mishaps. Player interviews citizens, writes or speaks better instructions, watches Construction Sprites repair Town Hall, and learns a reusable Prompt Blueprint: **Goal, Context, Constraints, Output**.

## Prototype target

- Four-hour hard implementation cap
- Three-minute guided judge demo; five-to-eight-minute normal play
- One complete Town Hall Prompt Quest
- Procedural Soft Toy City rendered with Three.js
- Typed prompts plus Realtime voice transcription
- Structured OpenAI evaluation with deterministic local quest rules
- Generated voice hints
- Public Codex Sites deployment
- Adult-only public hackathon prototype; support for minors requires a future safety and compliance phase

## Documentation

- [Proposal](docs/PROPOSAL.md) — pitch, scope, experience, success criteria
- [Product and system flows](docs/FLOWS.md) — player journey, turn sequence, state machine, fallback paths
- [Architecture](docs/ARCHITECTURE.md) — components, APIs, data contracts, safety boundaries
- [Four-hour workflow](docs/HACKATHON-WORKFLOW.md) — Codex orchestration, timing, gates, kill order
- [Buildable design specification](docs/superpowers/specs/2026-08-19-ai-city-mayor-game-design.md)
- [Domain language](CONTEXT.md)
- [Architectural decisions](docs/adr/README.md)

## Current status

Backend core is implemented and tested. The frontend and 3D experience have not started; live OpenAI calls and public deployment still require configured credentials and environment verification.

## Backend setup

Install dependencies, then validate the production build locally:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` there. This project key must stay server-side: never place it in client code, browser requests, or committed environment files.

The backend exposes three Node.js `POST` routes:

- `/api/evaluate` evaluates a Prompt Attempt and returns validated Quest Feedback.
- `/api/realtime-token` creates a short-lived transcription client secret.
- `/api/speech` returns approved generated MP3 voice hints for a known hint key.
