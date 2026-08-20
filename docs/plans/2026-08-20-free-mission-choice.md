# Free Mission Choice Migration Plan

Status: implemented and validated 2026-08-20.

## Product revision

Replace forced housing → hospital → urban-repair prerequisites with three independently selectable learning missions. Recommendation remains first incomplete mission in catalog order, but is advisory. Each mission keeps purpose, concept, objective, evaluation criteria, feedback, city effect, NPC acknowledgement, and completion state.

## Migration slices

1. Domain: remove prerequisite access state, model available/completed only, preserve active choice, canonicalize unique completion set in catalog order.
2. Authority: replace ordered-prefix HMAC payload validation with canonical unique-set validation. On success, verify incoming receipt and sign union of prior set plus evaluated mission.
3. API: accept any valid learning mission/step pair; retain body/schema limits, server binding checks, fail-closed provider handling, sanitized errors, no-store headers, and browser-claim stripping.
4. UI/localization: enable every mission button, replace lock/prerequisite copy with bilingual pedagogical purpose, keep optional recommendation and completed checkmark.
5. City/NPC: calculate budget from actual completed IDs, apply only completed mission effects, and acknowledge only NPC's related completion.
6. Persistence: trust server-verified receipt for completions; allow local active mission only as non-authoritative display preference.
7. Validation: RED→GREEN domain, receipt, route, contract, city-state, NPC, and bilingual copy tests; full offline gate; browser matrix.

## Rollback

Revert migration commit as one unit. Do not restore client-only locks without restoring ordered-prefix receipt validation and route enforcement together; split rollback would create mismatched authority/UI semantics. Existing v1 receipts remain syntactically valid because ordered prefixes are valid canonical sets. Rolling back after issuing non-prefix receipts (for example hospital-only) intentionally resets those receipts to empty progress instead of granting unsafe access.
