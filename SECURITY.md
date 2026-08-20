# Security Policy

## Supported versions

Security fixes target latest `main` branch. Hackathon snapshots and deployed forks are not separately supported.

## Reporting

Do not open public issue for suspected vulnerability. Use GitHub repository **Security → Report a vulnerability** for private advisory. Include affected commit, reproduction, impact, and whether any credential or provider cost may be involved. Never include real API keys, raw private prompts, microphone recordings, or personal data.

Maintainers should acknowledge reports within 7 days and provide status within 14 days. Complex fixes may need longer; reporter receives updates through private advisory.

## Security boundaries

- Permanent OpenAI keys stay server-only. No `NEXT_PUBLIC_` secret is supported.
- Browser calls server routes; browser-supplied score, criteria, or local progress is not authoritative.
- Realtime uses short-lived scoped client secrets and cannot grant progression directly.
- Paid routes require strict schemas, bounded bodies, timeouts, safe errors, and rate limits.
- Automated tests must remain credential-free and block OpenAI network hosts.

If accidental secret exposure or automated live provider traffic occurs, stop affected workflow, rotate/revoke credential, review usage, preserve minimal evidence without secret value, and disclose privately.
