import { describe, expect, it } from "vitest";

import type { RealtimeSessionRequest } from "../../domain/mission-contracts";
import { buildRealtimeSessionConfig } from "./realtime-instructions";
import { createRealtimeClientSecret, RealtimeCredentialError } from "./create-client-secret";

const projectKey = "sk-project-secret";
const model = "gpt-realtime-2.1";
const nowSeconds = 1_755_599_950;
const session: RealtimeSessionRequest = {
  missionId: "new_school",
  stepId: "design",
  language: "english",
  attempt: 1,
  satisfiedCriteria: [],
  safetyIdentifier: "install_1234567890abcdef",
};
const clientSecret = {
  value: "ek_realtime_ephemeral_secret",
  expires_at: 1_755_600_000,
  session: { type: "realtime", id: "sess_123", object: "realtime.session" },
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

function createInput(fetchImpl: typeof fetch) {
  return { apiKey: projectKey, session, model, fetchImpl, now: () => nowSeconds };
}

describe("createRealtimeClientSecret", () => {
  it("creates a 60-second mission-scoped bilingual Realtime client secret", async () => {
    const fake = fetchReturning(clientSecretResponse());

    await expect(createRealtimeClientSecret(createInput(fake.fetchImpl))).resolves.toEqual({
      value: clientSecret.value,
      expiresAt: clientSecret.expires_at,
    });

    expect(fake.calls).toHaveLength(1);
    const [url, options] = fake.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `Bearer ${projectKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": session.safetyIdentifier,
      },
    });
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      expires_after: { anchor: "created_at", seconds: 60 },
      ...buildRealtimeSessionConfig(session, model),
    });
  });

  it("maps only bounded client credential fields from valid response", async () => {
    const result = await createRealtimeClientSecret(
      createInput(fetchReturning(clientSecretResponse()).fetchImpl),
    );

    expect(result).toEqual({ value: clientSecret.value, expiresAt: clientSecret.expires_at });
    expect(result).not.toHaveProperty("session");
  });

  it("passes eight-second abort signal and sanitizes abort details", async () => {
    const timeoutCalls: number[] = [];
    const timeoutError = new Error("upstream secret detail");
    const signal = AbortSignal.abort(timeoutError);
    const result = createRealtimeClientSecret({
      ...createInput((async (_url, options) => {
        expect(options?.signal).toBe(signal);
        throw timeoutError;
      }) as typeof fetch),
      createTimeoutSignal: (timeoutMs) => {
        timeoutCalls.push(timeoutMs);
        return signal;
      },
    });

    await expect(result).rejects.toBeInstanceOf(RealtimeCredentialError);
    await expect(result).rejects.not.toThrow("upstream secret detail");
    expect(timeoutCalls).toEqual([8_000]);
  });

  it.each([
    ["non-success response", new Response('{"error":{"message":"upstream secret detail"}}', { status: 401 })],
    ["malformed JSON", new Response("{not-json")],
    ["missing value", Response.json({ expires_at: clientSecret.expires_at, session: clientSecret.session })],
    ["blank value", clientSecretResponse({ ...clientSecret, value: "   " })],
    ["wrong session type", clientSecretResponse({ ...clientSecret, session: { type: "transcription" } })],
    ["unexpected top-level data", clientSecretResponse({ ...clientSecret, unexpected: true })],
    ["expired secret", clientSecretResponse({ ...clientSecret, expires_at: nowSeconds })],
    ["overlong secret TTL", clientSecretResponse({ ...clientSecret, expires_at: nowSeconds + 121 })],
  ])("throws sanitized credential error for %s", async (_name, response) => {
    const create = () => createRealtimeClientSecret(createInput(fetchReturning(response).fetchImpl));

    const error = await create().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RealtimeCredentialError);
    expect((error as Error).message).not.toContain("upstream secret detail");
  });
});
