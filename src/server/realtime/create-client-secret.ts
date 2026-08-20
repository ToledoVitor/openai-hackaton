import { z } from "zod";

import type { RealtimeSessionRequest } from "../../domain/mission-contracts";
import { buildRealtimeSessionConfig } from "./realtime-instructions";

const REALTIME_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";
const REALTIME_CLIENT_SECRET_TIMEOUT_MS = 8_000;
const REALTIME_CLIENT_SECRET_TTL_SECONDS = 60;
const MAX_ACCEPTED_SECRET_TTL_SECONDS = 120;

const clientSecretSchema = z.strictObject({
  value: z.string().refine((value) => value.trim().length > 0),
  expires_at: z.number().int().positive(),
  session: z.object({ type: z.literal("realtime") }).passthrough(),
});

export class RealtimeCredentialError extends Error {
  constructor() {
    super("Realtime credentials are unavailable.");
    this.name = "RealtimeCredentialError";
  }
}

export async function createRealtimeClientSecret(input: {
  apiKey: string;
  session: RealtimeSessionRequest;
  model: string;
  fetchImpl?: typeof fetch;
  createTimeoutSignal?: (timeoutMs: number) => AbortSignal;
  now?: () => number;
}): Promise<{ value: string; expiresAt: number }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? (() => Date.now() / 1_000);
  const signal = (input.createTimeoutSignal ?? AbortSignal.timeout)(
    REALTIME_CLIENT_SECRET_TIMEOUT_MS,
  );

  try {
    const headers = {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": input.session.safetyIdentifier,
    };

    const response = await fetchImpl(REALTIME_CLIENT_SECRET_URL, {
      method: "POST",
      signal,
      headers,
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: REALTIME_CLIENT_SECRET_TTL_SECONDS },
        ...buildRealtimeSessionConfig(input.session, input.model),
      }),
    });

    if (!response.ok) throw new RealtimeCredentialError();
    const clientSecret = clientSecretSchema.parse(await response.json());
    const ttlSeconds = clientSecret.expires_at - now();
    if (ttlSeconds <= 0 || ttlSeconds > MAX_ACCEPTED_SECRET_TTL_SECONDS) {
      throw new RealtimeCredentialError();
    }
    return { value: clientSecret.value, expiresAt: clientSecret.expires_at };
  } catch (error) {
    if (error instanceof RealtimeCredentialError) throw error;
    throw new RealtimeCredentialError();
  }
}
