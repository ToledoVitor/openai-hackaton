import { z } from "zod";

const TRANSCRIPTION_SESSION_URL = "https://api.openai.com/v1/realtime/transcription_sessions";

const transcriptionSessionSchema = z
  .object({
    client_secret: z.strictObject({
      value: z.string().refine((value) => value.trim().length > 0),
      expires_at: z.number().int().positive(),
    }),
  })
  .passthrough();

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
    const response = await fetchImpl(TRANSCRIPTION_SESSION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_audio_transcription: {
          model: "gpt-4o-mini-transcribe",
          language: "en",
        },
        input_audio_noise_reduction: { type: "near_field" },
        turn_detection: { type: "server_vad" },
      }),
    });

    if (!response.ok) {
      throw new RealtimeCredentialError();
    }

    const session = transcriptionSessionSchema.parse(await response.json());

    return {
      value: session.client_secret.value,
      expiresAt: session.client_secret.expires_at,
    };
  } catch (error) {
    if (error instanceof RealtimeCredentialError) {
      throw error;
    }

    throw new RealtimeCredentialError();
  }
}
