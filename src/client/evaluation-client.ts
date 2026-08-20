import {
  evaluateMissionResponseSchema,
  type EvaluateMissionRequest,
  type EvaluateMissionResponse,
} from "../domain/mission-contracts";

export type ClientEvaluationErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_response"
  | "network_error"
  | "timeout";

export class ClientEvaluationError extends Error {
  readonly code: ClientEvaluationErrorCode;

  constructor(code: ClientEvaluationErrorCode) {
    super(code);
    this.name = "ClientEvaluationError";
    this.code = code;
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function classifyHttpError(status: number): ClientEvaluationErrorCode {
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "invalid_request";
}

function classifyNetworkError(error: unknown): ClientEvaluationErrorCode {
  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return "timeout";
  }
  return "network_error";
}

export async function evaluateMissionOnServer(
  request: EvaluateMissionRequest,
  options: {
    fetcher?: Fetcher;
    signal?: AbortSignal;
  } = {},
): Promise<EvaluateMissionResponse> {
  const fetcher = options.fetcher ?? fetch;

  let response: Response;
  try {
    response = await fetcher("/api/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: options.signal ?? AbortSignal.timeout(12_000),
    });
  } catch (error) {
    throw new ClientEvaluationError(classifyNetworkError(error));
  }

  if (!response.ok) {
    throw new ClientEvaluationError(classifyHttpError(response.status));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ClientEvaluationError("invalid_response");
  }

  const parsed = evaluateMissionResponseSchema.safeParse(body);
  if (!parsed.success) throw new ClientEvaluationError("invalid_response");
  if ((parsed.data.status === "partial" || parsed.data.status === "success") && !parsed.data.progressReceipt) {
    throw new ClientEvaluationError("invalid_response");
  }
  return parsed.data;
}
