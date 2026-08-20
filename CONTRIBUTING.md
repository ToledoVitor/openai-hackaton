# Contributing to AI City

## Before opening a change

1. Search existing issues and keep scope focused.
2. Never add secrets, personal data, provider output, or media without documented redistribution rights.
3. Preserve Portuguese and English parity. Add readable fallback and tests for primary copy keys.
4. Keep progression decisions on server. Browser state may present progress but must not authorize it.
5. Keep OpenAI, Speech, Realtime, and agent-like tests deterministic and offline.

## Development

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Use test-driven development for behavior changes: focused failing test, observed failure, minimal implementation, passing focused test, then full gate. Tests must inject fixtures/fakes for provider and Realtime boundaries. Any live OpenAI request from automation blocks merge.

For Next.js changes, read relevant guide under `node_modules/next/dist/docs/` first. For scene changes, validate desktop and mobile, keyboard plus touch/click movement, mission start, and `window.cidadeViva`.

## Pull requests

- Explain player-visible outcome and security impact.
- Include RED/GREEN evidence and final commands.
- Call out bundle-size changes.
- Add bilingual screenshots only when every shown asset has confirmed redistribution rights.
- List new dependencies and media with source, version, license, and local license file.
- Do not weaken offline guard, suppress types, ignore tests, or hide errors.

Contributions are licensed under Apache-2.0 per section 5 of [LICENSE](LICENSE), unless explicitly marked “Not a Contribution.”
