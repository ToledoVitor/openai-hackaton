# Mission Asset Effect Catalog

**Status:** Approved API-to-asset contract

**Date:** 2026-08-19

## Purpose

Define every visual effect key the Mission Evaluation API may return. Asset and UI agents must use these stable IDs rather than infer visuals from player-facing feedback. Visual briefs describe required state, not a required modeling technique.

## Consumption contract

- `effectKeys` may contain multiple compatible entries.
- First key is primary scene outcome. Remaining keys are compatible overlays, trade-offs, or completion additions.
- Never activate two mutually exclusive geometry states in same scene layer.
- `Persistent` effects remain until superseded by later progress or reset.
- `Transient` effects play once and leave persistent city geometry unchanged.
- Branch completion replaces incomplete/failure geometry for that mission.
- Asset implementation may combine reusable primitives, but key names and visual meaning remain stable.
- All signage and visible text need Portuguese and English variants or text-free iconography.

## System effects

| Effect key | Kind | Trigger | Visual brief | Persistence |
|---|---|---|---|---|
| `off_topic_no_change` | Redirect | Prompt does not concern current mission | Construction Sprites pause beside rolled blueprint; friendly question-mark bubble; city geometry unchanged | Transient |
| `unsafe_input_no_change` | Redirect | Moderation flags prompt | Friendly shield/stop icon near idle crew; do not visualize harmful content; city unchanged | Transient |
| `evaluation_unavailable_no_change` | System failure | Live extraction and fallback cannot conclude | Crew closes toolbox; small offline/cloud badge; existing progress remains visible | Transient |
| `temperature_trial_unavailable` | System failure | Mission 4 generation fails while extraction remains usable | Temperature console pauses with dimmed output screen and retry icon; project geometry unchanged | Transient |

## Mission 1 — A Nova Escola / The New School

| Effect key | Kind | Trigger | Visual brief | Persistence |
|---|---|---|---|---|
| `school_goal_unclear` | Failure | Prompt does not clearly request a school | Empty civic lot, blank unrolled blueprint, waiting crew | Persistent until goal passes |
| `school_too_small` | Comic failure | Prompt asks only for a school without path, context, or scale | Charming one-room miniature school; oversized queue of residents cannot fit; preserve approachable tone | Persistent until scale/context improves |
| `school_branch_ambiguous` | Failure | Prompt does not choose compact-center or yard-neighborhood path | Half urban facade and half suburban yard outline joined awkwardly; unfinished center seam | Persistent until path selected |
| `school_wrong_context` | Failure | Location/community context is missing or conflicts with selected path | Portable school shell placed against visibly mismatched surroundings; location pin/sign points elsewhere | Persistent until context passes |
| `school_capacity_missing` | Partial failure | Path/context exist but size or capacity remains unspecified | Correct building style but tiny interior footprint; crowd queue and capacity gauge visibly overflow | Persistent until scale passes |
| `school_inaccessible` | Failure | Accessible entry absent | Tall stairs, narrow doorway, wheelchair/stroller characters waiting outside; no distress imagery | Persistent until accessibility passes |
| `school_compact_overbuilt` | Path failure | Compact-center path lacks compact-footprint constraint | Sprawling school blocks sidewalk/neighboring plots in dense center | Persistent until branch feature passes |
| `school_yard_missing` | Path failure | Yard-neighborhood path lacks explicit yard | Neighborhood school surrounded by hard paving or parking; children look toward empty fenced strip | Persistent until branch feature passes |
| `school_compact_center_complete` | Success | All compact-center criteria pass | Multi-story compact school, accessible entrance, clear civic identity, active characters entering/exiting, intact sidewalks | Persistent completion state |
| `school_yard_neighborhood_complete` | Success | All yard-neighborhood criteria pass | Lower neighborhood school, accessible entrance, generous green yard/play space, active characters entering/exiting | Persistent completion state |

## Mission 2 — Caminho Seguro / Safe Path

| Effect key | Kind | Trigger | Visual brief | Persistence |
|---|---|---|---|---|
| `path_goal_unclear` | Failure | Prompt lacks clear safe-route goal | Sidewalk ends before road; crew studies blank route map | Persistent until goal passes |
| `path_unsafe_for_children` | Failure | Prompt omits children as target users | Adult-scaled crossing with high controls, long distance, and poor child sightlines | Persistent until child context passes |
| `path_branch_ambiguous` | Failure | Prompt chooses neither smart signals nor calm green street | Half-installed signal beside half-built planter/chicane; neither system operational | Persistent until path selected |
| `path_plan_too_vague` | Partial failure | Concrete example or safety criterion missing | Random cones and generic signs without coherent route; checklist board remains mostly blank | Persistent until example/criterion passes |
| `crossing_time_unsafe` | Smart-signals failure | Smart-signal path lacks child detection or safe crossing time | Signal changes while child figures remain mid-crossing; clear countdown visualization, no collision | Persistent until timing requirement passes |
| `street_too_fast` | Calm-street failure | Calm-street path lacks speed-calming requirement | Cars shown with speed streaks along wide straight lane; pedestrians wait at curb | Persistent until calming passes |
| `street_without_trees` | Calm-street failure | Calm-street path lacks trees/shade | Bare hot sidewalk, empty tree pits, strong sun patch; route functional but uncomfortable | Persistent until green feature passes |
| `path_accessibility_missing` | Failure | Accessible crossing absent | High curb, missing ramp/tactile strip, mobility-device character waiting | Persistent until accessibility passes |
| `smart_signals_complete` | Success | All smart-signal criteria pass | Child-aware signals, generous countdown, raised/marked accessible crossing, stopped traffic, children crossing safely | Persistent completion state |
| `calm_green_street_complete` | Success | All calm-green-street criteria pass | Narrow slow lane, trees/shade, raised accessible crossing, benches/planters, children walking safely | Persistent completion state |

## Mission 3 — O Imprevisto / The Unexpected Event

| Effect key | Kind | Trigger | Visual brief | Persistence |
|---|---|---|---|---|
| `services_scope_incomplete` | Failure | Prompt recognizes only water or only garbage | Operations board shows one acknowledged alert and one blinking ignored alert | Persistent until both problems pass |
| `services_priority_ambiguous` | Failure | No explicit first priority | Water and garbage dispatch arrows overlap; crews wait at fork with undecided signs | Persistent until priority selected |
| `priority_reason_missing` | Partial failure | Priority exists without reason | Dispatch board points to one service but rationale panel remains blank/question-marked | Persistent until reasoning passes |
| `crews_split_ineffectively` | Failure | Work is not decomposed or ordered | Two half-crews start pipe and garbage work simultaneously; both jobs visibly unfinished | Persistent until ordered steps pass |
| `water_supply_delayed` | Trade-off | `garbage_first` selected | Garbage cleanup active/completed while dry fountain, low tank gauge, and queued water truck show temporary delay | Persistent until secondary water step completes |
| `garbage_collection_delayed` | Trade-off | `water_first` selected | Water flowing/restoration active while contained garbage piles and queued collection truck show temporary delay | Persistent until secondary garbage step completes |
| `secondary_service_abandoned` | Failure | Prompt never schedules non-priority service | Priority service restored; other service area visibly worsens with abandoned work marker | Persistent until preservation passes |
| `review_step_missing` | Partial failure | Plan has no verification/review | Repairs appear complete but small leak or unsecured bin remains beside unchecked clipboard | Persistent until review passes |
| `water_first_recovery` | Path progress | Valid water-first plan passes priority and ordering | Water crew restores tank/fountain first; garbage crew visibly queued with numbered next-step marker | Persistent path stage |
| `garbage_first_recovery` | Path progress | Valid garbage-first plan passes priority and ordering | Streets cleaned first; water tankers/repair crew visibly queued with numbered next-step marker | Persistent path stage |
| `city_services_recovered` | Success | All mission criteria pass | Flowing water, clean streets, completed inspection checklist, both crews celebrating together | Persistent completion state |

## Mission 4 — A Escola da Cidade / The City School

| Effect key | Kind | Trigger | Visual brief | Persistence |
|---|---|---|---|---|
| `temperature_missing` | Validation failure | Mission 4 request lacks temperature choice | Control console with empty temperature dial and three unselected positions | Transient or persistent until selection |
| `temperature_too_low_creative` | Learning failure | `creative_design` uses low temperature | Output wall shows several nearly identical project cards/models with muted variation | Persistent until another creative trial |
| `temperature_too_high_critical` | Learning failure | `critical_instructions` uses medium/high temperature | Safety/operating board shows inconsistent arrows, reordered steps, and conflicting icon variants; no dangerous action occurs | Persistent until low-temperature trial |
| `project_branch_ambiguous` | Failure | Prompt chooses neither AI lab nor reading plaza | Awkward hybrid shell: half computer lab, half outdoor bookshelf, unfinished division | Persistent until project selected |
| `project_constraints_missing` | Partial failure | Chosen project lacks operational, access, or safety constraints | Correct project shell with missing rails, signage, shade, power/cable covers, or circulation details | Persistent until constraints pass |
| `ai_lab_incomplete` | Path failure | AI-lab path remains partial | Empty lab benches, boxed computers, loose cables, inactive display, inaccessible workstation gap | Persistent until AI-lab completion |
| `reading_plaza_incomplete` | Path failure | Reading-plaza path remains partial | Bookshelves without shaded seating/plaza circulation, unfinished paths, inaccessible shelf zone | Persistent until reading-plaza completion |
| `ai_lab_complete` | Path success | AI-lab project criteria pass | Welcoming accessible AI lab, protected cables, collaborative stations, active displays, supervised-use signage | Persistent project state |
| `reading_plaza_complete` | Path success | Reading-plaza project criteria pass | Accessible library opening onto shaded reading plaza, varied seating, trees, clear paths, active readers | Persistent project state |
| `temperature_mastered` | Mission success | Creative and critical trials both complete with comparison explained | Split demonstration console: colorful varied creative cards beside one precise consistent instruction card; temperature dial highlights learned ranges | Persistent completion state |

## Asset delivery checklist

For every persistent key, asset implementation should provide:

- named scene group matching effect key;
- deterministic show/hide state;
- compatible transition from previous mission states;
- reduced-motion presentation;
- no reliance on untranslated embedded texture text;
- readable silhouette at fixed isometric camera distance;
- fallback primitive version if polished asset misses deadline.

For every transient key, implementation should provide:

- bounded animation duration;
- text-free or localized icon treatment;
- no mutation of stored mission progress;
- replay behavior safe under repeated API responses.
