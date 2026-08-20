# Visual, Voice, and Free-Choice Review

Date: 2026-08-20

## Why

Players needed immediate agency, clearer entry/loading truth, a lived-in city, and optional voice without making housing a mandatory first lesson. Change removes pedagogically unnecessary gating while keeping evaluation authority server-side.

## Invariants reviewed

- All missions selectable; recommendation never blocks.
- Completion requires schema-valid server success plus installation-bound signed receipt.
- Receipt contains unique canonical mission set; client cannot add completion or criteria.
- NPC acknowledgement, budget, city effects, and completion count derive from actual completed IDs.
- Text remains primary. Voice module, microphone, and ephemeral secret require deliberate action; permission denial creates no provider request.
- Existing media unchanged; new streetscape uses documented CC0 clones and procedural geometry/instancing only.
- Entry remains initial lightweight boundary; Three.js loads after profile, Realtime after voice action.
- Automated tests unset OpenAI credentials and block OpenAI hosts.

## Acceptance evidence

- TDD RED observed for free access, unordered receipt, progress contract, independent city cost, localized purpose, lazy voice, voice state classification, deterministic layout, evaluation-response scoping, and voice reset recovery.
- 243 offline tests across 43 files pass; typecheck, lint, production build pass.
- Browser: 360×640, 390×844, 1280×720, 1920×1080; no horizontal overflow, false entry spinner, locked mission, or overlay/control overlap. Hospital selected first and showed matching purpose/NPC/prompt.
- Final chunks: page 48,189 B; bootstrap 4,549 B; post-entry runtime 724,662 B; explicit-action Realtime 4,386 B raw.
- Static client/source review found no permanent credential. Browser validation did not click voice, request microphone, call Realtime, or submit provider evaluation.

## Risks and release status

- Signed receipt is stateless; replaying older valid receipt can roll same installation back to signed subset, never forward/forge completion. Server storage would be needed for monotonic cross-device history.
- Live microphone, Realtime, and provider quality remain manual-only.
- Post-entry Three.js runtime remains large and needs device profiling before deeper split.
- Existing AI City logo provenance remains unresolved public-release blocker. This phase adds no media or distribution-rights claim.
