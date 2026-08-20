import {
  evaluationRequestSchema,
  type EvaluationRequest,
  type TurnResult,
  turnResultSchema,
} from "../../../src/domain/contracts";
import {
  evaluateMissionRequestSchema,
  evaluateMissionResponseSchema,
  MISSION_STEPS,
  type EvaluateMissionRequest,
  type EvaluateMissionResponse,
  type EvaluationErrorCode,
  type EvaluationErrorResponse,
} from "../../../src/domain/mission-contracts";
import { EvaluationError, ModerationUnavailableError } from "../../../src/server/evaluation/errors";
import {
  evaluateMissionPrompt,
  evaluatePrompt,
} from "../../../src/server/evaluation/evaluate-prompt";
import { createOpenAIEvaluationGateway } from "../../../src/server/evaluation/openai-gateway";
import {
  createTemperatureClient,
  runTemperatureTrial,
} from "../../../src/server/evaluation/temperature-trial";
import {
  readJsonWithLimit,
} from "../../../src/server/guardrails";

export const runtime = "nodejs";

type Evaluate = (request: EvaluationRequest) => Promise<TurnResult>;
type EvaluateMission = (request: EvaluateMissionRequest) => Promise<EvaluateMissionResponse>;

const EVALUATION_BODY_LIMIT_BYTES = 16 * 1024;

function json(body: unknown, status: number, cacheControl = "no-store"): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": cacheControl, Pragma: "no-cache" },
  });
}

function missionError(
  code: EvaluationErrorCode,
  field?: string,
): EvaluationErrorResponse {
  return {
    error: {
      code,
      message: code,
      retryable: code === "moderation_unavailable" || code === "internal_error",
      ...(field ? { field } : {}),
    },
    ...(code === "temperature_required" ? { effectKeys: ["temperature_missing"] } : {}),
  };
}

function invalidMissionRequest(body: unknown): EvaluationErrorResponse {
  const value = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (value.language !== "portuguese" && value.language !== "english") {
    return missionError("invalid_language", "language");
  }
  if (
    value.missionId === "city_school" &&
    value.temperatureChoice === undefined
  ) {
    return missionError("temperature_required", "temperatureChoice");
  }
  if (
    value.missionId !== "city_school" &&
    value.temperatureChoice !== undefined
  ) {
    return missionError("temperature_not_allowed", "temperatureChoice");
  }
  const validMissionStep =
    typeof value.missionId === "string" &&
    value.missionId in MISSION_STEPS &&
    typeof value.stepId === "string" &&
    MISSION_STEPS[value.missionId as keyof typeof MISSION_STEPS].includes(
      value.stepId as never,
    );
  if (!validMissionStep && typeof value.missionId === "string" && typeof value.stepId === "string") {
    return missionError("invalid_mission_step", "stepId");
  }
  return missionError("invalid_request");
}

export function createEvaluatePost(dependencies: {
  evaluate: Evaluate;
  evaluateMission?: EvaluateMission;
}) {
  return async function post(request: Request): Promise<Response> {
    let body: unknown;

    try {
      body = await readJsonWithLimit(request, EVALUATION_BODY_LIMIT_BYTES);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    const isMissionRequest =
      typeof body === "object" && body !== null && "missionId" in body;

    if (isMissionRequest) {
      const parsed = evaluateMissionRequestSchema.safeParse(body);
      if (!parsed.success) return json(invalidMissionRequest(body), 400);
      if (!dependencies.evaluateMission) return json(missionError("internal_error"), 503);

      try {
        const result = evaluateMissionResponseSchema.parse(
          await dependencies.evaluateMission(parsed.data),
        );
        return json(result, 200, "no-store");
      } catch (error) {
        if (error instanceof ModerationUnavailableError) {
          return json(missionError("moderation_unavailable"), 503);
        }
        if (error instanceof EvaluationError) {
          return json(
            {
              error: {
                code: error.code,
                message: error.code,
                retryable: error.retryable,
                ...(error.field ? { field: error.field } : {}),
              },
              ...(error.effectKeys ? { effectKeys: error.effectKeys } : {}),
            },
            error.status,
          );
        }
        return json(missionError("internal_error"), 500);
      }
    }

    let evaluationRequest: EvaluationRequest;
    try {
      evaluationRequest = evaluationRequestSchema.parse(body);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    try {
      const result = turnResultSchema.parse(await dependencies.evaluate(evaluationRequest));

      return json(result, 200, "no-store");
    } catch (error) {
      if (error instanceof ModerationUnavailableError) {
        return json({ error: "moderation_unavailable" }, 503);
      }

      return json({ error: "service_unavailable" }, 503);
    }
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json({ error: "service_unavailable" }, 503);
  }

  const gateway = createOpenAIEvaluationGateway(apiKey);
  const temperatureClient = createTemperatureClient(apiKey);

  return createEvaluatePost({
    evaluate: (evaluationRequest) =>
      evaluatePrompt(evaluationRequest, {
        moderation: gateway,
        extraction: gateway,
      }),
    evaluateMission: (evaluationRequest) =>
      evaluateMissionPrompt(evaluationRequest, {
        moderation: gateway,
        extraction: gateway,
        temperature: {
          run: (request) => runTemperatureTrial({ request, client: temperatureClient }),
        },
      }),
  })(request);
}
