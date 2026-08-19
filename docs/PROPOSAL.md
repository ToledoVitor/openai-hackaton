# AI City Mayor — Hackathon Proposal

**Status:** Proposed for four-hour implementation

**Date:** 2026-08-19

**Public prototype audience:** Adults 18+

**Future product audience:** AI beginners, potentially including ages 12+ after dedicated safety and compliance work

## Pitch

AI City Mayor turns prompt improvement into visible city repair. Player inherits a whimsical modern City damaged by previous mayor's vague instructions. Citizens explain what went wrong. Player writes or speaks better instructions to cute Construction Sprites. Each clearer prompt visibly repairs Town Hall.

Game teaches prompting through consequence, not lecture. A vague instruction produces a comic but understandable result. Adding a Goal, Context, Constraints, and desired Output repairs specific 3D features. Player sees exactly why better instructions matter.

## Problem

Prompt tutorials often explain techniques through static text or isolated chat examples. Beginners struggle to connect wording changes with model behavior, judge whether an output is good, or understand that prompt quality depends on explicit goals and evaluation criteria.

Hackathon also demands spectacle. Product must communicate value within seconds, demonstrate real OpenAI capabilities, survive model/network variance, and remain buildable in four hours.

## Solution

Build one polished vertical slice: repair Town Hall.

1. New Mayor arrives and sees giant stairs, tiny door, no weather cover, and confusing signage.
2. Three citizens reveal concrete needs: accessible entrance, clear civic sign, weather cover.
3. Needs become pinned Project Brief.
4. Player submits free-text Prompt Attempt by keyboard or push-to-talk transcription.
5. OpenAI extracts semantic intent into strict structured data.
6. Deterministic quest rules compare extracted civic traits against Project Brief.
7. Three.js animates matching repair meshes.
8. Citizen reaction, checklist, and generated voice hint provide Quest Feedback.
9. After first weak attempt, game reveals Prompt Blueprint: Goal, Context, Constraints, Output.
10. Player refines until all requirements pass, Town Hall celebrates, and next District lights up.

Citizen beats stay concrete: a mobility advocate needs a ramp and wide entry, a new resident needs a readable **CITY HALL** sign, and a commuter needs a canopy above the entrance. These needs are visible, never hidden puzzle conditions.

## Why this can win

- **Immediate visual story:** broken 3D City becomes repaired during demo.
- **Authentic AI interaction:** free text and live voice, not multiple-choice answers.
- **Clear learning:** every prompt change maps to visible requirement.
- **Reliable presentation:** model interprets language; local rules own progression.
- **OpenAI breadth with purpose:** Responses, Structured Outputs, Realtime transcription, Speech, and Moderation support one coherent loop.
- **Expandable world:** future Districts can teach examples, evaluation, context limits, tool use, agents, memory, and multimodality.

## Visual direction

Use **Soft Toy City**: fixed isometric diorama, rounded procedural geometry, soft materials, bright civic colors, gentle shadows, and playful tween animation. Scene behaves like miniature tabletop City rather than free-roaming 3D world.

City Command layout keeps diorama dominant, Project Brief pinned on right, and prompt/microphone controls anchored at bottom.

## Core learning model

First Prompt Quest teaches:

- **Goal:** exact civic result Mayor wants.
- **Context:** citizen needs and relevant City facts.
- **Constraints:** concrete boundaries and required features.
- **Output:** desired result shape or presentation.

Examples remain future District content. Game does not teach magic personas, mandatory chain-of-thought, “longer is always better,” or exact keywords.

## Stretch Side Quest: Parameter Trial

After core quest works, unlock short live comparison:

- Creative task: generate City festival names.
- Consistency-sensitive task: write emergency instructions.
- Compare low, medium, and high temperature using a compatibility-tested model.
- Use `0.2`, `0.7`, and `1.2` while leaving `top_p` unchanged.
- Lesson: no universally best temperature; setting depends on task.

Parameter Trial never blocks core Town Hall completion.

## OpenAI capability map

| Capability | Product purpose |
|---|---|
| Responses API + GPT-5.6 Luna | Extract prompt structure and civic traits |
| Structured Outputs | Guarantee response shape before local evaluation |
| Realtime transcription over WebRTC | Convert push-to-talk speech into editable prompt text |
| Speech API | Read approved citizen hint aloud |
| `omni-moderation-latest` | Filter harmful public input before evaluation |
| Project API key | Authenticate server-side model calls |

## Demo script

1. **0:00–0:20:** Show broken Town Hall and previous mayor's vague order.
2. **0:20–0:45:** Hear three citizen needs populate Project Brief.
3. **0:45–1:10:** Speak vague repair prompt. Construction Sprites repair only one feature.
4. **1:10–1:35:** Show Prompt Blueprint and voiced hint.
5. **1:35–2:15:** Add missing context and constraints. Town Hall completes with animation.
6. **2:15–2:40:** Citizens celebrate; next District unlocks.
7. **2:40–3:00:** Flash Parameter Trial and architecture proof: live OpenAI interpretation, deterministic game state.

## Success criteria

- New player understands vague-versus-specific prompt lesson without explanation.
- Town Hall repairs correspond to semantic meaning, not exact keywords.
- Typed core path completes in five-to-eight minutes.
- Guided demo completes in three minutes twice consecutively.
- Voice transcription and speech degrade cleanly to text.
- Model failure switches to prepared fallback without breaking quest.
- Public Codex Sites URL works over HTTPS with server secret protected.
- Fixed prompt suite passes before release.

## Explicit exclusions

- No accounts, database, multiplayer, resource economy, avatar movement, procedural city generation, or runtime image generation.
- No open-ended AI chat.
- No minor-facing public launch during hackathon.
- No free camera, physics destruction, skeletal character system, or imported 3D asset pipeline.
- No full Evals API integration; use fast local fixtures.
- No more than one required Prompt Quest.

## Official references

- [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [API authentication](https://developers.openai.com/api/reference/overview#authentication)
- [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Moderation model](https://developers.openai.com/api/docs/models/omni-moderation-latest)
- [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
- [OpenAI Showcase](https://developers.openai.com/showcase)
