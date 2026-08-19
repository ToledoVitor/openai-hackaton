import type {
  EffectKey,
  EvaluateMissionRequest,
  EvaluateMissionResponse,
  MissionExtraction,
  TemperatureTrial,
} from "../mission-contracts";
import { createFeedback } from "./feedback";
import { getMissionDefinition } from "./mission-registry";

function uniqueEffects(values: readonly EffectKey[]): EffectKey[] {
  return [...new Set(values)];
}

function effectsFor(input: {
  request: EvaluateMissionRequest;
  extraction: MissionExtraction;
  status: EvaluateMissionResponse["status"];
  missing: readonly string[];
  temperatureTrial?: TemperatureTrial;
}): EffectKey[] {
  if (input.status === "redirected") return ["off_topic_no_change"];

  const definition = getMissionDefinition(input.request.missionId);
  const effects: EffectKey[] = [];

  if (input.status === "success") {
    const successEffect = input.extraction.choice
      ? definition.successEffectByPath[input.extraction.choice]
      : undefined;
    if (successEffect) effects.push(successEffect);
    if (input.request.missionId === "city_school") effects.push("temperature_mastered");
    if (input.request.missionId === "unexpected_event") {
      effects.unshift(
        input.extraction.choice === "water_first" ? "water_first_recovery" : "garbage_first_recovery",
      );
    }
    return uniqueEffects(effects);
  }

  const nextMissing = input.missing[0];
  if (
    input.request.missionId === "new_school" &&
    input.extraction.criteria.school_goal_clear?.met &&
    input.missing.includes("school_scale_defined")
  ) {
    effects.push("school_too_small");
  } else if (nextMissing) {
    const failureEffect = definition.failureEffectByCriterion[nextMissing];
    if (failureEffect) effects.push(failureEffect);
  } else {
    effects.push("evaluation_unavailable_no_change");
  }

  if (input.request.missionId === "unexpected_event") {
    if (input.extraction.choice === "water_first") {
      effects.push("water_first_recovery", "garbage_collection_delayed");
    } else if (input.extraction.choice === "garbage_first") {
      effects.push("garbage_first_recovery", "water_supply_delayed");
    }
  }

  if (input.temperatureTrial?.status === "unavailable") {
    effects.push("temperature_trial_unavailable");
  } else if (input.temperatureTrial?.status === "generated") {
    if (input.temperatureTrial.observationKey === "creative_too_repetitive") {
      effects.push("temperature_too_low_creative");
    }
    if (input.temperatureTrial.observationKey === "critical_too_unpredictable") {
      effects.push("temperature_too_high_critical");
    }
  }

  return uniqueEffects(effects);
}

export function evaluateMission(input: {
  request: EvaluateMissionRequest;
  extraction: MissionExtraction;
  source: "live" | "fallback";
  temperatureTrial?: TemperatureTrial;
}): EvaluateMissionResponse {
  const definition = getMissionDefinition(input.request.missionId);
  const allowed = new Set(definition.criteria);
  const previous = new Set(input.request.satisfiedCriteria.filter((criterion) => allowed.has(criterion)));

  if (input.extraction.offTopic) {
    const satisfied = definition.criteria.filter((criterion) => previous.has(criterion));
    const missing = definition.criteria.filter((criterion) => !previous.has(criterion));
    return {
      missionId: input.request.missionId,
      stepId: input.request.stepId,
      language: input.request.language,
      source: input.source,
      status: "redirected",
      choice: null,
      progress: { satisfied: [...satisfied], newlySatisfied: [], missing: [...missing] },
      teachingConcept: definition.teachingConcept[input.request.language],
      feedback: createFeedback({
        language: input.request.language,
        missionId: input.request.missionId,
        status: "redirected",
        choice: null,
        nextMissingCriterion: missing[0] ?? null,
      }),
      effectKeys: ["off_topic_no_change"],
      ...(input.temperatureTrial ? { temperatureTrial: input.temperatureTrial } : {}),
    };
  }

  const candidate = new Set<string>();
  for (const criterion of definition.criteriaByStep[input.request.stepId] ?? []) {
    if (input.extraction.criteria[criterion]?.met) candidate.add(criterion);
  }

  const branchCriterion =
    input.request.missionId === "new_school"
      ? "school_branch_selected"
      : input.request.missionId === "safe_path"
        ? "path_branch_selected"
        : input.request.missionId === "unexpected_event"
          ? "service_priority_selected"
          : "city_school_project_selected";
  if (input.extraction.choice === null) {
    candidate.delete(branchCriterion);
    if (input.request.missionId === "new_school") candidate.delete("school_branch_feature_defined");
    if (input.request.missionId === "safe_path") candidate.delete("path_branch_requirements_defined");
    if (input.request.missionId === "unexpected_event") candidate.delete("priority_reasoned");
    if (input.request.missionId === "city_school") candidate.delete("project_constraints_defined");
  } else {
    candidate.add(branchCriterion);
  }

  if (input.request.missionId === "city_school") {
    candidate.add("temperature_provided");
    if (input.temperatureTrial?.status === "generated") {
      candidate.add(
        input.request.stepId === "creative_design"
          ? "creative_temperature_tested"
          : "critical_temperature_tested",
      );
    }
  }

  const newlySatisfied = definition.criteria.filter(
    (criterion) => candidate.has(criterion) && !previous.has(criterion),
  );
  for (const criterion of newlySatisfied) previous.add(criterion);

  if (
    input.request.missionId === "city_school" &&
    previous.has("creative_temperature_tested") &&
    previous.has("critical_temperature_tested") &&
    previous.has("expected_behavior_explained")
  ) {
    if (!previous.has("temperature_comparison_complete")) {
      previous.add("temperature_comparison_complete");
      newlySatisfied.push("temperature_comparison_complete");
    }
  }

  const satisfied = definition.criteria.filter((criterion) => previous.has(criterion));
  const missing = definition.criteria.filter((criterion) => !previous.has(criterion));
  const status: EvaluateMissionResponse["status"] =
    missing.length === 0 ? "success" : newlySatisfied.length === 0 ? "retry" : "partial";
  const effectKeys = effectsFor({
    request: input.request,
    extraction: input.extraction,
    status,
    missing,
    ...(input.temperatureTrial ? { temperatureTrial: input.temperatureTrial } : {}),
  });

  return {
    missionId: input.request.missionId,
    stepId: input.request.stepId,
    language: input.request.language,
    source: input.source,
    status,
    choice: input.extraction.choice,
    progress: {
      satisfied: [...satisfied],
      newlySatisfied,
      missing: [...missing],
    },
    teachingConcept: definition.teachingConcept[input.request.language],
    feedback: createFeedback({
      language: input.request.language,
      missionId: input.request.missionId,
      status,
      choice: input.extraction.choice,
      nextMissingCriterion: missing[0] ?? null,
    }),
    effectKeys,
    ...(input.temperatureTrial ? { temperatureTrial: input.temperatureTrial } : {}),
  };
}
