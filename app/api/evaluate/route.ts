import {
  evaluationRequestSchema,
  type EvaluationRequest,
  type TurnResult,
  turnResultSchema,
} from "../../../src/domain/contracts";
import { ModerationUnavailableError } from "../../../src/server/evaluation/errors";
import { evaluatePrompt } from "../../../src/server/evaluation/evaluate-prompt";
import { createOpenAIEvaluationGateway } from "../../../src/server/evaluation/openai-gateway";
import {
  readJsonWithLimit,
} from "../../../src/server/guardrails";

export const runtime = "nodejs";

type Evaluate = (request: EvaluationRequest) => Promise<TurnResult>;

const EVALUATION_BODY_LIMIT_BYTES = 16 * 1024;

function json(body: unknown, status: number, cacheControl?: string): Response {
  return Response.json(body, {
    status,
    headers: cacheControl ? { "Cache-Control": cacheControl } : undefined,
  });
}

export function createEvaluatePost(dependencies: { evaluate: Evaluate }) {
  return async function post(request: Request): Promise<Response> {
    let evaluationRequest: EvaluationRequest;

    try {
      evaluationRequest = evaluationRequestSchema.parse(
        await readJsonWithLimit(request, EVALUATION_BODY_LIMIT_BYTES),
      );
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

  return createEvaluatePost({
    evaluate: (evaluationRequest) =>
      evaluatePrompt(evaluationRequest, {
        moderation: gateway,
        extraction: gateway,
      }),
  })(request);
}
