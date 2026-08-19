# Mission API and Realtime Voice

Server reads `OPENAI_API_KEY` only from environment. Optional `OPENAI_REALTIME_MODEL` selects voice model; default is `gpt-realtime`. Every successful response uses `Cache-Control: no-store`.

## Evaluate mission

`POST /api/evaluate`

```json
{
  "missionId": "new_school",
  "stepId": "design",
  "language": "portuguese",
  "prompt": "Construa uma escola compacta no centro para 300 alunos, com entrada acessível.",
  "attempt": 2,
  "satisfiedCriteria": ["school_goal_clear"],
  "safetyIdentifier": "installation_7Q2mN4xP8vR1"
}
```

Omit `temperatureChoice` outside `city_school`. For both `city_school` steps, send `low`, `medium`, or `high`.

Success body:

```json
{
  "missionId": "new_school",
  "stepId": "design",
  "language": "portuguese",
  "source": "live",
  "status": "partial",
  "choice": "compact_center",
  "progress": {
    "satisfied": ["school_goal_clear", "school_branch_selected"],
    "newlySatisfied": ["school_branch_selected"],
    "missing": ["school_context_clear", "school_scale_defined", "school_accessible", "school_branch_feature_defined"]
  },
  "teachingConcept": "Objetivo, contexto, escala e restrições",
  "feedback": {
    "summary": "O projeto melhorou, mas ainda falta um detalhe.",
    "explanation": "Próximo critério: explique o contexto.",
    "nextInstruction": "Explique onde a escola será construída e quem ela atenderá."
  },
  "effectKeys": ["school_wrong_context"]
}
```

Only `progress` and `effectKeys` are authoritative for game state. API remains stateless; send returned `progress.satisfied` in next attempt.

Exact languages: `portuguese`, `english`. Server never auto-detects or switches response language.

## Create Realtime Voice session

`POST /api/realtime-token`

```json
{
  "missionId": "new_school",
  "stepId": "design",
  "language": "portuguese",
  "attempt": 2,
  "satisfiedCriteria": ["school_goal_clear"],
  "safetyIdentifier": "installation_7Q2mN4xP8vR1"
}
```

Response:

```json
{
  "value": "ek_realtime_ephemeral_secret",
  "expiresAt": 1755600000,
  "model": "gpt-realtime"
}
```

Use `value` only to establish browser WebRTC connection with OpenAI. Never expose project API key.

Session includes:

- audio input/output;
- server VAD and near-field noise reduction;
- transcription hint `pt` or `en` selected only from request language;
- mission-scoped coaching instructions;
- function tool `submit_prompt({ prompt })`.

## Frontend tool relay

1. Receive completed `submit_prompt` call on WebRTC data channel.
2. Combine tool `prompt` with current UI state.
3. Call `/api/evaluate`.
4. Send full HTTP result back as function-call output using original call ID.
5. Send `response.create` so voice explains validated result.
6. Update city only from HTTP evaluation response.

Illustrative data-channel events:

```ts
dataChannel.send(JSON.stringify({
  type: "conversation.item.create",
  item: {
    type: "function_call_output",
    call_id: callId,
    output: JSON.stringify(evaluationResult),
  },
}));

dataChannel.send(JSON.stringify({ type: "response.create" }));
```

## Errors

- `400 invalid_request`: malformed session request.
- `400 invalid_language`: evaluator language missing or unsupported.
- `400 invalid_mission_step`: mission/step mismatch.
- `400 temperature_required`: Mission 4 lacks temperature selection.
- `429 too_many_requests`: Cloudflare paid-route quota.
- `503 moderation_unavailable`: evaluation blocked before model extraction.
- `503 realtime_unavailable`: Realtime credential creation failed.
- `500 internal_error`: sanitized unexpected evaluator failure.

Typed evaluation remains available when microphone permission, WebRTC, or Realtime service fails.
