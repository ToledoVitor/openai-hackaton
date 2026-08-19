import { z } from "zod";

import type { RealtimeSessionRequest } from "../../domain/mission-contracts";
import { buildRealtimeSessionConfig } from "./realtime-instructions";

const REALTIME_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";
const REALTIME_CLIENT_SECRET_TIMEOUT_MS = 8_000;

const clientSecretSchema = z.strictObject({
  value: z.string().refine((value) => value.trim().length > 0),
  expires_at: z.number().int().positive(),
  session: z.object({ type: z.enum(["realtime", "transcription"]) }).passthrough(),
});

export class RealtimeCredentialError extends Error {
  constructor() {
    super("Realtime credentials are unavailable.");
    this.name = "RealtimeCredentialError";
  }
}

export async function createRealtimeClientSecret(input: {
  apiKey: string;
  session?: RealtimeSessionRequest;
  model?: string;
  fetchImpl?: typeof fetch;
  createTimeoutSignal?: (timeoutMs: number) => AbortSignal;
}): Promise<{ value: string; expiresAt: number; model?: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const model = input.model ?? "gpt-realtime";
  const signal = (input.createTimeoutSignal ?? AbortSignal.timeout)(
    REALTIME_CLIENT_SECRET_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(REALTIME_CLIENT_SECRET_URL, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        ...(input.session
          ? { "OpenAI-Safety-Identifier": input.session.safetyIdentifier }
          : {}),
      },
      body: JSON.stringify(
        input.session
          ? buildRealtimeSessionConfig(input.session, model)
          : {
              session: {
                type: "transcription",
                audio: {
                  input: {
                    transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
                    noise_reduction: { type: "near_field" },
                    turn_detection: { type: "server_vad" },
                  },
                },
              },
            },
      ),
    });

    if (!response.ok) {
      throw new RealtimeCredentialError();
    }

    const clientSecret = clientSecretSchema.parse(await response.json());

    const credential: { value: string; expiresAt: number; model?: string } = {
      value: clientSecret.value,
      expiresAt: clientSecret.expires_at,
    };
    if (input.session) credential.model = model;
    return credential;
  } catch (error) {
    if (error instanceof RealtimeCredentialError) {
      throw error;
    }

    throw new RealtimeCredentialError();
  }
}
