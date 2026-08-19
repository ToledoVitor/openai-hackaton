import { describe, expect, it } from "vitest";

import { createRealtimeClientSecret, RealtimeCredentialError } from "./create-client-secret";

const projectKey = "sk-project-secret";
const clientSecret = {
  value: "ek_realtime_ephemeral_secret",
  expires_at: 1_755_600_000,
};

function sessionResponse(clientSecretResponse: unknown = clientSecret): Response {
  return Response.json({
    id: "sess_123",
    object: "realtime.transcription_session",
    client_secret: clientSecretResponse,
  });
}

function fetchReturning(response: Response): { fetchImpl: typeof fetch; calls: Parameters<typeof fetch>[] } {
  const calls: Parameters<typeof fetch>[] = [];

  return {
    fetchImpl: (async (...args: Parameters<typeof fetch>) => {
      calls.push(args);
      return response;
    }) as typeof fetch,
    calls,
  };
}

describe("createRealtimeClientSecret", () => {
  it("creates an English near-field transcription session with server VAD", async () => {
    const fake = fetchReturning(sessionResponse());

    await expect(
      createRealtimeClientSecret({ apiKey: projectKey, fetchImpl: fake.fetchImpl }),
    ).resolves.toEqual({ value: clientSecret.value, expiresAt: clientSecret.expires_at });

    expect(fake.calls).toHaveLength(1);
    const [url, options] = fake.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/realtime/transcription_sessions");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `Bearer ${projectKey}`,
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      input_audio_transcription: {
        model: "gpt-4o-mini-transcribe",
        language: "en",
      },
      input_audio_noise_reduction: { type: "near_field" },
      turn_detection: { type: "server_vad" },
    });
  });

  it("maps only the client credential fields from a valid session", async () => {
    const result = await createRealtimeClientSecret({
      apiKey: projectKey,
      fetchImpl: fetchReturning(sessionResponse()).fetchImpl,
    });

    expect(result).toEqual({ value: clientSecret.value, expiresAt: clientSecret.expires_at });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("client_secret");
  });

  it.each([
    ["a non-success response", new Response('{"error":{"message":"upstream secret detail"}}', { status: 401 })],
    ["malformed JSON", new Response("{not-json")],
    [
      "a missing client secret",
      Response.json({ id: "sess_123", object: "realtime.transcription_session" }),
    ],
    ["a blank client secret", sessionResponse({ ...clientSecret, value: "   " })],
  ])("throws a sanitized credential error for %s", async (_name, response) => {
    const create = () =>
      createRealtimeClientSecret({
        apiKey: projectKey,
        fetchImpl: fetchReturning(response).fetchImpl,
      });

    await expect(create()).rejects.toBeInstanceOf(RealtimeCredentialError);
    await expect(create()).rejects.not.toThrow("upstream secret detail");
  });
});
