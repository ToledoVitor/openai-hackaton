import { z } from "zod";

const REALTIME_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";

const clientSecretSchema = z.strictObject({
  value: z.string().refine((value) => value.trim().length > 0),
  expires_at: z.number().int().positive(),
  session: z.object({ type: z.literal("transcription") }).passthrough(),
});

export class RealtimeCredentialError extends Error {
  constructor() {
    super("Realtime credentials are unavailable.");
    this.name = "RealtimeCredentialError";
  }
}

export async function createRealtimeClientSecret(input: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ value: string; expiresAt: number }> {
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(REALTIME_CLIENT_SECRET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "transcription",
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
                language: "en",
              },
              noise_reduction: { type: "near_field" },
              turn_detection: { type: "server_vad" },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new RealtimeCredentialError();
    }

    const clientSecret = clientSecretSchema.parse(await response.json());

    return {
      value: clientSecret.value,
      expiresAt: clientSecret.expires_at,
    };
  } catch (error) {
    if (error instanceof RealtimeCredentialError) {
      throw error;
    }

    throw new RealtimeCredentialError();
  }
}
