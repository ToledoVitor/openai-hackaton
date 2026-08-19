import type { EffectKey, EvaluationErrorCode } from "../../domain/mission-contracts";

export class ModerationUnavailableError extends Error {
  constructor() {
    super("Moderation is unavailable.");
    this.name = "ModerationUnavailableError";
  }
}

export class EvaluationError extends Error {
  constructor(
    readonly status: number,
    readonly code: EvaluationErrorCode,
    readonly retryable: boolean,
    readonly field?: string,
    readonly effectKeys?: EffectKey[],
  ) {
    super(code);
    this.name = "EvaluationError";
  }
}
