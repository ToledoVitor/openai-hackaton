import { describe, expect, it } from "vitest";

import { createRealtimeClientSecret, RealtimeCredentialError } from "./create-client-secret";

const projectKey = "sk-project-secret";
const clientSecret = {
  value: "ek_realtime_ephemeral_secret",
  expires_at: 1_755_600_000,
  session: {
    type: "transcription",
    id: "sess_123",
    object: "realtime.transcription_session",
  },
};

function clientSecretResponse(response: unknown = clientSecret): Response {
  return Response.json(response);
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
  it("creates an English near-field transcription client secret with server VAD", async () => {
    const fake = fetchReturning(clientSecretResponse());

    await expect(
      createRealtimeClientSecret({ apiKey: projectKey, fetchImpl: fake.fetchImpl }),
    ).resolves.toEqual({ value: clientSecret.value, expiresAt: clientSecret.expires_at });

    expect(fake.calls).toHaveLength(1);
    const [url, options] = fake.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `Bearer ${projectKey}`,
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
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
    });
  });

  it("maps only the client credential fields from a valid session", async () => {
    const result = await createRealtimeClientSecret({
      apiKey: projectKey,
      fetchImpl: fetchReturning(clientSecretResponse()).fetchImpl,
    });

    expect(result).toEqual({ value: clientSecret.value, expiresAt: clientSecret.expires_at });
    expect(result).not.toHaveProperty("session");
  });

  it("passes an eight-second abort signal to fetch and sanitizes an abort failure", async () => {
    const timeoutCalls: number[] = [];
    const timeoutError = new Error("upstream secret detail");
    const signal = AbortSignal.abort(timeoutError);

    const result = createRealtimeClientSecret({
      apiKey: projectKey,
      createTimeoutSignal: (timeoutMs) => {
        timeoutCalls.push(timeoutMs);
        return signal;
      },
      fetchImpl: (async (_url, options) => {
        expect(options?.signal).toBe(signal);
        throw timeoutError;
      }) as typeof fetch,
    });

    await expect(result).rejects.toBeInstanceOf(RealtimeCredentialError);
    await expect(result).rejects.not.toThrow("upstream secret detail");
    expect(timeoutCalls).toEqual([8_000]);
  });

  it.each([
    ["a non-success response", new Response('{"error":{"message":"upstream secret detail"}}', { status: 401 })],
    ["malformed JSON", new Response("{not-json")],
    [
      "a missing client-secret value",
      Response.json({ expires_at: clientSecret.expires_at, session: clientSecret.session }),
    ],
    ["a blank client-secret value", clientSecretResponse({ ...clientSecret, value: "   " })],
    ["a non-transcription session", clientSecretResponse({ ...clientSecret, session: { type: "realtime" } })],
    ["unexpected top-level session data", clientSecretResponse({ ...clientSecret, unexpected: true })],
  ])("throws a sanitized credential error for %s", async (_name, response) => {
    const create = () =>
      createRealtimeClientSecret({
        apiKey: projectKey,
        fetchImpl: fetchReturning(response).fetchImpl,
      });

    const error = await create().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RealtimeCredentialError);
    expect((error as Error).message).not.toContain("upstream secret detail");
  });
});
