# AI City

AI City is a bilingual educational mayor game. Players explore a low-poly Three.js city, learn to write precise civic plans, complete three ordered missions, receive server-authoritative feedback, and see residents and city state respond.

Journey: language and name → explorable city → housing mission → hospital mission → urban-error repair → feedback and next step.

## Current release status

Code is prepared under Apache-2.0. Bundled CC0 city models and audio have source/license records. `public/assets/brand/ai-city-logo.png` has no authoritative source or distribution-license record in repository history; public source releases must exclude/replace it or obtain written rights first. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

No screenshot is embedded because repository does not yet contain one with confirmed redistribution rights.

## Local setup

Requires Node.js 22.13 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open localhost URL printed by dev server. `OPENAI_API_KEY` is optional for entry, exploration, copy, and deterministic domain tests. Keep it server-only; never create `NEXT_PUBLIC_OPENAI_API_KEY`.

## Safe provider testing

Automated tests are offline and deterministic. Vitest deletes `OPENAI_API_KEY` and blocks network requests to `openai.com` and subdomains. Any automated live provider call, credential use, or token cost is release-blocking.

Real evaluation, Speech, or Realtime testing is manual-only: a human explicitly starts app with server-side key, performs intended action, and monitors usage. Never put production prompts, secrets, or personal data in fixtures.

## Quality commands

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `app/`: Next-compatible page and server routes. Browser calls server routes only.
- `src/domain/`: typed mission registry, ordered journey, evaluation rules, NPC dialogue.
- `src/server/`: OpenAI gateways, timeouts, validation, progress receipts, safe errors.
- `src/game/main.ts`: lightweight entry bootstrap.
- `src/game/runtime.ts`: deferred Three.js/game runtime loaded after profile submit.
- `src/client/`: language, storage, and typed HTTP clients.
- `tests/offline-openai-guard.ts`: global no-key/no-provider test guard.

Progression is server-authoritative. Realtime is optional and lazy; it cannot grant completion directly.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Small first contributions include bilingual copy tests, accessibility checks, deterministic browser fixtures, and asset-provenance improvements.

## Documentation

- [Sprint architecture and validation](docs/AI_CITY_OVERNIGHT_SPRINT.md)
- [API contract](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Asset attribution audit](ATTRIBUTIONS.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## License

Source code and project documentation: [Apache License 2.0](LICENSE), copyright 2026 Vitor Toledo.

Repository revisions before this transition were distributed under MIT; original copyright and permission notice remains at [LICENSES/MIT-legacy.txt](LICENSES/MIT-legacy.txt). Apache-2.0 governs new contributions/current distribution without removing permissions or notices attached to earlier MIT-licensed revisions.

Media keeps its own license/provenance status. Apache-2.0 does not grant rights to third-party or unresolved media; consult [ATTRIBUTIONS.md](ATTRIBUTIONS.md) before redistribution.
