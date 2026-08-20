import { createHmac, timingSafeEqual } from "node:crypto";

import {
  canonicalCompletedMissionIds,
  isCanonicalCompletedMissionIds,
  type LearningMissionId,
} from "../../domain/learning-journey";

export type VerifiedProgress = { completedMissionIds: LearningMissionId[] };

export type ProgressAuthority = {
  issue(safetyIdentifier: string, completedMissionIds: readonly LearningMissionId[]): string;
  verify(receipt: string, safetyIdentifier: string): VerifiedProgress | null;
};

type ReceiptPayload = {
  version: 1;
  safetyIdentifier: string;
  completedMissionIds: LearningMissionId[];
};

export function createProgressAuthority(secret: string): ProgressAuthority {
  if (secret.length < 8) throw new Error("Progress signing secret is too short.");
  const signingKey = createHmac("sha256", secret).update("ai-city-progress-v1").digest();
  const sign = (payload: string) => createHmac("sha256", signingKey).update(payload).digest("base64url");

  return {
    issue(safetyIdentifier, completedMissionIds) {
      if (new Set(completedMissionIds).size !== completedMissionIds.length) {
        throw new Error("Completed missions must be unique.");
      }
      const canonicalIds = canonicalCompletedMissionIds(completedMissionIds);
      if (canonicalIds.length !== completedMissionIds.length) throw new Error("Invalid completed mission set.");
      const payload = Buffer.from(JSON.stringify({
        version: 1,
        safetyIdentifier,
        completedMissionIds: canonicalIds,
      } satisfies ReceiptPayload)).toString("base64url");
      return `${payload}.${sign(payload)}`;
    },
    verify(receipt, safetyIdentifier) {
      const [payload, signature, extra] = receipt.split(".");
      if (!payload || !signature || extra !== undefined) return null;
      const expected = Buffer.from(sign(payload));
      const actual = Buffer.from(signature);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      try {
        const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (typeof parsed !== "object" || parsed === null) return null;
        const value = parsed as Partial<ReceiptPayload>;
        if (value.version !== 1 || value.safetyIdentifier !== safetyIdentifier) return null;
        if (!Array.isArray(value.completedMissionIds) || !isCanonicalCompletedMissionIds(value.completedMissionIds)) return null;
        return { completedMissionIds: [...value.completedMissionIds] };
      } catch {
        return null;
      }
    },
  };
}
