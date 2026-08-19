import { z } from "zod";

export const NEED_KEYS = ["accessibleEntrance", "clearSign", "weatherCover"] as const;
export type NeedKey = (typeof NEED_KEYS)[number];

export const HINT_KEYS = [
  "stateGoal",
  "addCitizenContext",
  "requireAccessibleEntrance",
  "requireClearSign",
  "requireWeatherCover",
  "describeOutput",
  "celebrate",
  "playfulRedirect",
] as const;
export type HintKey = (typeof HINT_KEYS)[number];

const needKeySchema = z.enum(NEED_KEYS);
const hintKeySchema = z.enum(HINT_KEYS);

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

const uniqueNeedsSchema = z.array(needKeySchema).superRefine((needs, context) => {
  if (!hasUniqueValues(needs)) {
    context.addIssue({
      code: "custom",
      message: "Needs must not contain duplicates.",
    });
  }
});

export const promptExtractionSchema = z
  .object({
    offTopic: z.boolean(),
    promptBlueprint: z
      .object({
        goal: z.boolean(),
        context: z.boolean(),
        constraints: z.boolean(),
        output: z.boolean(),
      })
      .strict(),
    civicTraits: z
      .object({
        accessibleEntrance: z.boolean(),
        clearSign: z.boolean(),
        weatherCover: z.boolean(),
      })
      .strict(),
    evidence: z.array(z.string().trim().min(1).max(160)).max(4),
    citizenLine: z.string().trim().min(1).max(220),
    nextHint: hintKeySchema,
  })
  .strict();
export type PromptExtraction = z.infer<typeof promptExtractionSchema>;

export const evaluationRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(600),
    questId: z.literal("town-hall"),
    currentPassedNeeds: uniqueNeedsSchema,
    safetyIdentifier: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  })
  .strict();
export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>;

export const turnResultSchema = z
  .object({
    source: z.enum(["live", "fallback"]),
    offTopic: z.boolean(),
    repairDelta: uniqueNeedsSchema,
    passedNeeds: uniqueNeedsSchema,
    nextStage: z.enum(["ready", "partial", "restored"]),
    citizenLine: z.string().trim().min(1).max(220),
    nextHint: hintKeySchema,
    celebration: z.boolean(),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.repairDelta.some((need) => !result.passedNeeds.includes(need))) {
      context.addIssue({
        code: "custom",
        path: ["repairDelta"],
        message: "Every repair must be present in passed needs.",
      });
    }

    const passedCount = result.passedNeeds.length;
    const stageMatchesProgress =
      (result.nextStage === "ready" && passedCount === 0) ||
      (result.nextStage === "partial" && (passedCount === 1 || passedCount === 2)) ||
      (result.nextStage === "restored" && passedCount === NEED_KEYS.length);

    if (!stageMatchesProgress) {
      context.addIssue({
        code: "custom",
        path: ["nextStage"],
        message: "Stage must match the number of passed Town Hall needs.",
      });
    }

    if (result.nextStage === "restored" && !NEED_KEYS.every((need) => result.passedNeeds.includes(need))) {
      context.addIssue({
        code: "custom",
        path: ["passedNeeds"],
        message: "Restored results must include every Town Hall need.",
      });
    }

    if (result.nextStage === "restored" ? !result.celebration : result.celebration) {
      context.addIssue({
        code: "custom",
        path: ["celebration"],
        message: "Only restored results celebrate.",
      });
    }
  });
export type TurnResult = z.infer<typeof turnResultSchema>;
