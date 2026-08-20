import { z } from "zod";

import type { RealtimeSessionRequest } from "../domain/mission-contracts";

const realtimeCredentialSchema = z.object({
  value: z.string().trim().min(3).max(2_048),
  expiresAt: z.number().int().positive(),
}).strict();

export type RealtimeClientErrorCode =
  | "rate_limited"
  | "unavailable"
  | "invalid_credential"
  | "network_error";

export class RealtimeClientError extends Error {
  readonly code: RealtimeClientErrorCode;

  constructor(code: RealtimeClientErrorCode) {
    super(code);
    this.name = "RealtimeClientError";
    this.code = code;
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function requestRealtimeCredential(
  session: RealtimeSessionRequest,
  options: { fetcher?: Fetcher; signal?: AbortSignal } = {},
) {
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)("/api/realtime-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(session),
      signal: options.signal ?? AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RealtimeClientError("network_error");
  }

  if (!response.ok) {
    throw new RealtimeClientError(response.status === 429 ? "rate_limited" : "unavailable");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RealtimeClientError("invalid_credential");
  }
  const parsed = realtimeCredentialSchema.safeParse(body);
  if (!parsed.success) throw new RealtimeClientError("invalid_credential");
  return parsed.data;
}
