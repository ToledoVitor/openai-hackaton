# AI City Mayor — Buildable Design Specification

**Status:** Proposed for implementation

**Date:** 2026-08-19

**Constraint:** Four-hour coding cap

## Problem Statement

AI beginners need a concrete way to see how vague instructions create poor model outcomes and how clear goals, context, constraints, and output expectations improve results. Static prompt tutorials lack emotional consequence and visible progression. Hackathon judges also need to understand product value and OpenAI integration within a three-minute demo.

## Solution

Build a public adult-only prototype where Player becomes Mayor of a whimsical modern City. Previous mayor's vague instruction damaged Town Hall. Player gathers three Citizen Requests, types or speaks Prompt Attempts to Construction Sprites, and watches procedural 3D repair stages appear when semantic requirements pass.

OpenAI extracts prompt structure and civic traits into strict data. Deterministic quest rules compare those traits against Project Brief and own progression. Quest Feedback combines citizen reaction, requirement checklist, one action-oriented hint, and optional generated speech. Core ends with restored Town Hall, celebration, and next District teaser.

## User Stories

1. As a Player, I want to understand City's problem immediately, so that I know why Mayor must act.
2. As a Player, I want previous mayor's vague instruction shown beside comic damage, so that I connect ambiguity with outcome.
3. As a Player, I want to interview citizens, so that I gather relevant Context before prompting.
4. As a Player, I want discovered needs pinned in Project Brief, so that challenge tests prompting rather than memory.
5. As a Player, I want to type any reasonable civic instruction, so that interaction feels like real prompting.
6. As a Player, I want to speak my instruction, so that voice provides an accessible and impressive alternative input.
7. As a Player, I want speech transcript editable before submission, so that transcription errors do not become game errors.
8. As a Player, I want Construction Sprites to react visibly, so that model interpretation feels embodied in City.
9. As a Player, I want each passed need to repair one visible Town Hall feature, so that prompt consequence is clear.
10. As a Player, I want semantic equivalents accepted, so that game teaches meaning rather than keywords.
11. As a Player, I want failed attempts to preserve existing repairs, so that experimentation still feels like progress.
12. As a Player, I want first weak attempt to reveal Prompt Blueprint, so that instruction arrives when useful.
13. As a Player, I want one improvement hint at a time, so that feedback stays actionable.
14. As a Player, I want citizen hint spoken aloud when enabled, so that feedback feels alive.
15. As a Player, I want unlimited attempts with stronger help over time, so that I cannot become permanently stuck.
16. As a Player, I want off-topic or unsafe input redirected playfully, so that City remains coherent and safe.
17. As a Player, I want Town Hall celebration when all needs pass, so that learning produces emotional payoff.
18. As a Player, I want next District teased, so that prototype communicates expandable curriculum.
19. As a Player, I want progression restored after refresh, so that accidental reload does not erase work.
20. As a Player, I want a reset action, so that demo can restart cleanly.
21. As a Player with microphone denied, I want full typed experience, so that voice failure never blocks play.
22. As a Player with reduced-motion preference, I want calmer transitions, so that visual spectacle remains accessible.
23. As a Player on narrow screen, I want clear landscape/larger-screen guidance, so that broken layout is not mistaken for broken game.
24. As a judge, I want complete story in three minutes, so that product value and technical depth are obvious.
25. As a judge, I want see real OpenAI interpretation separated from game rules, so that reliability is credible.
26. As a presenter, I want prepared fallback for API failure, so that demonstration can continue honestly.
27. As a presenter, I want live/fallback source visible, so that demo never misrepresents scripted output as live.
28. As a maintainer, I want quest rules pure and deterministic, so that learning behavior can be tested without network.
29. As a maintainer, I want model output schema-validated, so that malformed data cannot corrupt state.
30. As a maintainer, I want API credentials server-only, so that public deployment does not leak project access.
31. As a maintainer, I want raw prompts and audio not persisted, so that prototype minimizes collected data.
32. As a maintainer, I want fixed prompt fixtures, so that prompt/schema changes can be checked against real cases.
33. As a Player, I want optional Parameter Trial after core completion, so that I learn sampling trade-offs without blocking main lesson.
34. As a Player in Parameter Trial, I want compare creative and consistency-sensitive tasks, so that I learn no temperature is universally best.

## Implementation Decisions

- Use Next.js with TypeScript as single application boundary.
- Use React Three Fiber over Three.js plus minimal helper utilities for procedural Soft Toy City.
- Use fixed isometric camera. No player movement, orbit controls, physics, imported models, or runtime asset generation.
- Represent each Town Hall requirement as explicit broken and repaired mesh groups.
- Use reducer/state-machine approach for narrative beats and quest progression.
- Persist progression, preferences, and random anonymous safety identifier in browser localStorage.
- Use Project Brief needs: accessible entrance, clear civic sign, weather cover.
- Use three fixed citizen beats: mobility advocate asks for ramp and wide entry; new resident asks for readable **CITY HALL** sign; commuter asks for entrance canopy.
- Reveal Prompt Blueprint after first weak Prompt Attempt: Goal, Context, Constraints, Output.
- Submit typed and transcribed prompts through same evaluation contract.
- Use Realtime transcription over WebRTC. Server mints short-lived credential. Transcript remains editable.
- Use Responses API with GPT-5.6 Luna at low reasoning effort and strict Structured Outputs.
- Use model only for semantic extraction: off-topic classification, Prompt Blueprint presence, civic traits, bounded evidence, citizen line, hint.
- Validate extraction on server before invoking deterministic quest engine.
- Quest engine compares civic traits against Project Brief and returns repair delta. Model never mutates game state.
- Moderate every Prompt Attempt with `omni-moderation-latest` before evaluation.
- Limit prompts to 600 characters and send stable privacy-preserving random installation identifier as `safety_identifier`.
- Use Speech API for approved hint text. Show AI-generated voice disclosure.
- Prepared fallback bank implements same Turn Result contract as live evaluation.
- Show subtle live/fallback indicator.
- Use local loading animation while awaiting non-streamed structured result. Do not render partial JSON.
- Use public Codex Sites deployment with protected server secret and HTTPS microphone access as mandatory release gates.
- Public prototype marked 18+. Minor-facing release stays outside hackathon scope.
- Parameter Trial is stretch feature after core and voice. Use GPT-5.2 with reasoning disabled and verify temperature compatibility during preflight.
- Use live temperature comparisons for festival-name creativity and emergency-instruction consistency.
- Compare temperatures `0.2`, `0.7`, and `1.2`.
- Use one control at a time: vary temperature, leave `top_p` unchanged.
- No database, login, analytics pipeline, prompt history, or server-side persistence.
- Primary integration seam is quest engine input/output. All OpenAI and fallback paths converge before this seam.

## Testing Decisions

- Tests assert external behavior: given current quest state and validated traits, verify returned repairs, progress, and completion. Avoid testing Three.js implementation details or prompt string internals.
- Unit-test quest engine for zero, one, two, and three matching traits; repeated traits; off-topic input; and preserved progress.
- Contract-test schema validation for valid result, missing field, extra field, overlong strings, contradictory result, timeout, and fallback selection.
- Run eight fixed prompt fixtures: vague, single-trait, complete, semantic synonym, contradiction, off-topic, prompt injection, nonsense.
- Browser-test typed complete path, guided retries, fallback path, reset, refresh recovery, microphone denial, speech failure, reduced motion, and narrow screen notice.
- Smoke-test production build locally and through public Sites URL.
- Verify project API key absent from browser bundles and responses.
- Verify raw prompt, transcript, and audio absent from localStorage.
- Verify guided demo completes under three minutes twice consecutively.
- Repository has no testing prior art because implementation begins from empty project.

## Out of Scope

- Public use by minors.
- Multiple required Prompt Quests.
- Accounts, database, multiplayer, economy, city simulation, or analytics.
- Free-roaming Mayor, interactive camera, physics, skeletal animation, or imported 3D asset pipeline.
- Runtime image/video generation.
- Open-ended assistant conversation.
- User-generated citizen dialogue or unbounded speech.
- Full Evals API integration, fine-tuning, vector database, agents, tools, memory, or retrieval.
- Localization and full mobile layout.
- Production legal/compliance program.

## Further Notes

- Source of truth for terminology: repository `CONTEXT.md`.
- Source of truth for hard architectural trade-offs: repository ADRs.
- Four-hour sequencing and kill order: `docs/HACKATHON-WORKFLOW.md`.
- Public Sites deployment and OpenAI project API key are preflight dependencies, not late-stage setup.
- Proposal intentionally optimizes memorable show quality while protecting one truthful learning loop.
