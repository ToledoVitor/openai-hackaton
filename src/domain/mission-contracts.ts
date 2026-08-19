import { z } from "zod";

export const MISSION_IDS = [
  "new_school",
  "safe_path",
  "unexpected_event",
  "city_school",
] as const;
export type MissionId = (typeof MISSION_IDS)[number];

export const MISSION_STEP_IDS = [
  "design",
  "response_plan",
  "creative_design",
  "critical_instructions",
] as const;
export type MissionStepId = (typeof MISSION_STEP_IDS)[number];

export const LANGUAGES = ["portuguese", "english"] as const;
export type Language = (typeof LANGUAGES)[number];

export const TEMPERATURE_CHOICES = ["low", "medium", "high"] as const;
export type TemperatureChoice = (typeof TEMPERATURE_CHOICES)[number];

export const MISSION_STEPS: Readonly<Record<MissionId, readonly MissionStepId[]>> = {
  new_school: ["design"],
  safe_path: ["design"],
  unexpected_event: ["response_plan"],
  city_school: ["creative_design", "critical_instructions"],
};

export const MISSION_PATHS: Readonly<Record<MissionId, readonly string[]>> = {
  new_school: ["compact_center", "yard_neighborhood"],
  safe_path: ["smart_signals", "calm_green_street"],
  unexpected_event: ["water_first", "garbage_first"],
  city_school: ["ai_lab", "reading_plaza"],
};

export const effectKeys = [
  "off_topic_no_change", "unsafe_input_no_change",
  "evaluation_unavailable_no_change", "temperature_trial_unavailable",
  "school_goal_unclear", "school_too_small", "school_branch_ambiguous",
  "school_wrong_context", "school_capacity_missing", "school_inaccessible",
  "school_compact_overbuilt", "school_yard_missing",
  "school_compact_center_complete", "school_yard_neighborhood_complete",
  "path_goal_unclear", "path_unsafe_for_children", "path_branch_ambiguous",
  "path_plan_too_vague", "crossing_time_unsafe", "street_too_fast",
  "street_without_trees", "path_accessibility_missing",
  "smart_signals_complete", "calm_green_street_complete",
  "services_scope_incomplete", "services_priority_ambiguous",
  "priority_reason_missing", "crews_split_ineffectively",
  "water_supply_delayed", "garbage_collection_delayed",
  "secondary_service_abandoned", "review_step_missing",
  "water_first_recovery", "garbage_first_recovery", "city_services_recovered",
  "temperature_missing", "temperature_too_low_creative",
  "temperature_too_high_critical", "project_branch_ambiguous",
  "project_constraints_missing", "ai_lab_incomplete",
  "reading_plaza_incomplete", "ai_lab_complete", "reading_plaza_complete",
  "temperature_mastered",
] as const;
export type EffectKey = (typeof effectKeys)[number];

const missionIdSchema = z.enum(MISSION_IDS);
const missionStepIdSchema = z.enum(MISSION_STEP_IDS);
const languageSchema = z.enum(LANGUAGES);
const temperatureChoiceSchema = z.enum(TEMPERATURE_CHOICES);
const safetyIdentifierSchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const satisfiedCriteriaSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(32)
  .refine((values) => new Set(values).size === values.length, "Criteria must be unique.");

const missionContextSchema = z
  .object({
    missionId: missionIdSchema,
    stepId: missionStepIdSchema,
    language: languageSchema,
    attempt: z.number().int().positive().max(1_000),
    satisfiedCriteria: satisfiedCriteriaSchema,
    selectedChoice: z.string().trim().min(1).max(80).optional(),
    safetyIdentifier: safetyIdentifierSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (!MISSION_STEPS[value.missionId].includes(value.stepId)) {
      context.addIssue({ code: "custom", path: ["stepId"], message: "Invalid mission step." });
    }
    if (
      value.selectedChoice !== undefined &&
      !MISSION_PATHS[value.missionId].includes(value.selectedChoice)
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoice"],
        message: "Selected choice does not belong to this mission.",
      });
    }
  });

export const realtimeSessionRequestSchema = missionContextSchema;
export type RealtimeSessionRequest = z.infer<typeof realtimeSessionRequestSchema>;

export const evaluateMissionRequestSchema = missionContextSchema
  .safeExtend({
    prompt: z.string().trim().min(1).max(600),
    temperatureChoice: temperatureChoiceSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.missionId === "city_school" && value.temperatureChoice === undefined) {
      context.addIssue({
        code: "custom",
        path: ["temperatureChoice"],
        message: "Temperature is required for city_school.",
      });
    }

    if (value.missionId !== "city_school" && value.temperatureChoice !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["temperatureChoice"],
        message: "Temperature is only allowed for city_school.",
      });
    }
  });
export type EvaluateMissionRequest = z.infer<typeof evaluateMissionRequestSchema>;

export type MissionExtraction = {
  offTopic: boolean;
  choice: string | null;
  criteria: Record<string, { met: boolean; evidence: string }>;
};

export type TemperatureTrial =
  | {
      status: "generated";
      choice: TemperatureChoice;
      value: 0.2 | 0.7 | 1.2;
      generatedOutput: string;
      observationKey:
        | "creative_variety"
        | "creative_too_repetitive"
        | "critical_consistency"
        | "critical_too_unpredictable";
      errorCode: null;
    }
  | {
      status: "unavailable";
      choice: TemperatureChoice;
      value: 0.2 | 0.7 | 1.2;
      generatedOutput: null;
      observationKey: null;
      errorCode: "temperature_generation_unavailable";
    };

export type EvaluateMissionResponse = {
  missionId: MissionId;
  stepId: MissionStepId;
  language: Language;
  source: "live" | "fallback";
  status: "redirected" | "retry" | "partial" | "success";
  choice: string | null;
  progress: {
    satisfied: string[];
    newlySatisfied: string[];
    missing: string[];
  };
  teachingConcept: string;
  feedback: {
    summary: string;
    explanation: string;
    nextInstruction: string | null;
  };
  effectKeys: EffectKey[];
  temperatureTrial?: TemperatureTrial;
};

export type EvaluationErrorCode =
  | "invalid_request"
  | "invalid_language"
  | "invalid_mission_step"
  | "temperature_required"
  | "temperature_not_allowed"
  | "too_many_requests"
  | "moderation_unavailable"
  | "internal_error";

export type EvaluationErrorResponse = {
  error: {
    code: EvaluationErrorCode;
    message: string;
    retryable: boolean;
    field?: string;
  };
  effectKeys?: EffectKey[];
};
