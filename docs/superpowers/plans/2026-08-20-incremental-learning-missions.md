# Incremental Learning Missions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free school mission and make every mission show server-authoritative partial progress, criterion regressions, and constructive revision checkpoints.

**Architecture:** Extend learning mission registry and canonical signed progress from completion-only to bounded per-mission criterion snapshots. The pure evaluator calculates both additions and regressions from each revision; browser renders returned checkpoints but never authorizes them. Existing provider, moderation, no-store, receipt, offline-test, and deferred-runtime boundaries remain unchanged.

**Tech Stack:** Next/Vinext, TypeScript, Zod, Vitest, Three.js, HMAC receipts.

**Spec:** `docs/superpowers/specs/2026-08-20-school-incremental-learning-design.md`

## Global Constraints

- School is fourth freely selectable mission; no prerequisite.
- All missions use same partial/newly-satisfied/regressed/missing contract.
- Persist no raw prompt, transcript, model response, or audio.
- Server receipt is installation-bound HMAC authority; browser state is display-only.
- Provider/moderation failure returns retry with no state change.
- Tests use deterministic fakes only; remove OpenAI keys and block OpenAI hosts.
- Preserve typed and voice paths, bilingual copy, no-store headers, deferred Three/Realtime boundaries.

---

### Task 1: Canonical mission progress contract

**Files:**
- Modify: `src/domain/mission-contracts.ts`, `src/domain/learning-journey.ts`, `src/domain/missions/mission-registry.ts`, receipt/progress modules and tests.
- Test: `src/domain/learning-journey.test.ts`, `src/domain/mission-contracts.test.ts`, receipt/progress tests.

**Interfaces:**
- Produces `progress.regressed: string[]` and canonical mission criterion snapshots.
- Produces `school_construction` with `design` step, localized metadata, valid paths/criteria/effects.

- [ ] **Step 1: Write failing contract tests**

```ts
expect(evaluateMissionResponseSchema.parse({ ...response, progress: {
  satisfied: ['housing_goal_clear'], newlySatisfied: [], regressed: [], missing: []
}}).progress.regressed).toEqual([]);
expect(isLearningMissionId('school_construction')).toBe(true);
```

- [ ] **Step 2: Run RED tests**

Run: `npm test -- --run src/domain/mission-contracts.test.ts src/domain/learning-journey.test.ts`
Expected: missing `regressed` and school mission failure.

- [ ] **Step 3: Implement bounded types and registry**

```ts
progress: { satisfied: string[]; newlySatisfied: string[]; regressed: string[]; missing: string[] }
// Add only allowed criterion IDs to receipt payload; canonical registry order.
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/domain/mission-contracts.test.ts src/domain/learning-journey.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/mission-contracts.ts src/domain/learning-journey.ts src/domain/missions/mission-registry.ts src/domain/*.test.ts
git commit -m "feat: add canonical incremental mission progress"
```

### Task 2: Deterministic incremental evaluator

**Files:**
- Modify: `src/domain/missions/evaluate-mission.ts`, `src/domain/missions/fallback.ts`, `src/domain/missions/feedback.ts`, effect catalog/scene mapping.
- Test: `src/domain/learning-mission-evaluation.test.ts`, evaluator/fallback tests.

**Interfaces:**
- Consumes Task 1 canonical snapshots.
- Produces ordered additions/regressions and safe partial effects for any mission.

- [ ] **Step 1: Write failing progression and contradiction tests**

```ts
expect(partial.progress.newlySatisfied).toContain('school_scale_defined');
expect(smallerRevision.progress.regressed).toEqual(['school_scale_defined']);
expect(smallerRevision.progress.satisfied).toContain('school_accessible');
expect(housingRevision.progress.regressed).toEqual(['housing_budget_defined']);
```

- [ ] **Step 2: Run RED tests**

Run: `npm test -- --run src/domain/learning-mission-evaluation.test.ts`
Expected: regressions absent or prior criteria always accumulate.

- [ ] **Step 3: Implement criterion invalidation**

```ts
const next = deriveCurrentCriteria(request, extraction);
const regressed = definition.criteria.filter((id) => previous.has(id) && !next.has(id));
const satisfied = definition.criteria.filter((id) => next.has(id));
```

Keep explicit path-choice dependencies; remove only criteria contradicted by current revision. Preserve retry/no-change for unavailable provider.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/domain/learning-mission-evaluation.test.ts src/domain/missions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/missions src/domain/learning-mission-evaluation.test.ts
git commit -m "feat: evaluate incremental mission revisions"
```

### Task 3: API receipts and browser state

**Files:**
- Modify: `app/api/evaluate/route.ts`, progress/receipt modules, `src/client/evaluation-client.ts`, `src/game/runtime.ts`, `src/game/mission-evaluation-state.ts`.
- Test: API route, receipt/progress, client, runtime race tests.

**Interfaces:**
- Consumes Task 1 snapshots and Task 2 evaluator output.
- Produces signed per-mission snapshots only after valid evaluation response.

- [ ] **Step 1: Write failing API/reload/race tests**

```ts
expect(response.progress.regressed).toEqual(['hospital_capacity_defined']);
expect(reloaded.criteria.get('school_construction')).toContain('school_accessible');
expect(tamperedReceipt.status).toBe(400);
```

- [ ] **Step 2: Run RED tests**

Run: `npm test -- --run app/api/evaluate/route.test.ts src/client/evaluation-client.test.ts src/game/*evaluation*.test.ts`
Expected: receipt loses snapshots or client mutates authoritative state.

- [ ] **Step 3: Implement receipt and state application**

```ts
applyEvaluation(response) // renders server result only
saveProgressReceipt(storage, response.progressReceipt) // opaque token only
```

Bind response mission/step/language; stale response cannot overwrite selected mission UI. Keep raw prompts out of storage/logs.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run app/api/evaluate/route.test.ts src/client/evaluation-client.test.ts src/game/*evaluation*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/evaluate src/client/evaluation-client.ts src/game src/server src/**/__tests__
git commit -m "feat: persist signed incremental mission state"
```

### Task 4: Checkpoint UI, scene, and final validation

**Files:**
- Modify: `src/game/runtime.ts`, `app/globals.css`, `src/client/ui-copy.ts`, docs/API and sprint record.
- Test: UI copy/runtime/scene tests; browser matrix.

**Interfaces:**
- Consumes authoritative `progress` response from Task 3.
- Renders localized completed/new/pending/regressed checkpoints for all missions.

- [ ] **Step 1: Write failing UI tests**

```ts
expect(renderCheckpoints(result)).toContain('Corrigido agora');
expect(renderCheckpoints(result)).toContain('Ainda falta');
expect(localizeMission('school_construction', 'english').title).toContain('School');
```

- [ ] **Step 2: Run RED tests**

Run: `npm test -- --run src/client/ui-copy.test.ts src/game/*.test.ts`
Expected: no regression/checkpoint groups or school selection.

- [ ] **Step 3: Implement accessible presentation**

```ts
renderCheckpointGroup('complete', progress.satisfied)
renderCheckpointGroup('new', progress.newlySatisfied)
renderCheckpointGroup('pending', progress.missing)
renderCheckpointGroup('regressed', progress.regressed)
```

Use text-area last revision as visible editable draft; do not concatenate unseen prompts. Map safe partial scene effects for school and existing missions.

- [ ] **Step 4: Validate UI and full offline gate**

Run: `npm test -- --run && npm run typecheck && npm run lint && npm run build`
Expected: PASS with keys unset and OpenAI hosts blocked.

Browser: test 360×640, 390×844, 1280×720, 1920×1080; select every mission, submit partial/revision, verify checkpoint movement/no overflow, enter city, and verify `window.cidadeViva` in normal page context. Do not click voice or issue provider calls.

- [ ] **Step 5: Commit and document**

```bash
git add app/globals.css src/game/runtime.ts src/client/ui-copy.ts docs
git commit -m "feat: show incremental mission checkpoints"
```
