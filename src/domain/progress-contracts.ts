import { z } from "zod";

import { isCanonicalCompletedMissionIds, LEARNING_MISSION_IDS } from "./learning-journey";

const safetyIdentifierSchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const progressReceiptSchema = z.string().min(10).max(2048);
const completedMissionIdsSchema = z
  .array(z.enum(LEARNING_MISSION_IDS))
  .max(LEARNING_MISSION_IDS.length)
  .refine(
    isCanonicalCompletedMissionIds,
    "Completed missions must use canonical registry order.",
  );

export const progressRequestSchema = z.object({
  safetyIdentifier: safetyIdentifierSchema,
  progressReceipt: progressReceiptSchema.optional(),
}).strict();

export const progressResponseSchema = z.object({
  completedMissionIds: completedMissionIdsSchema,
  progressReceipt: progressReceiptSchema.optional(),
}).strict();

export type ProgressRequest = z.infer<typeof progressRequestSchema>;
export type ProgressResponse = z.infer<typeof progressResponseSchema>;
