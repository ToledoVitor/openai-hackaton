import { describe, expect, it } from "vitest";

import type { HintKey } from "../../../src/domain/contracts";
import { createOpenAISpeechGateway, createSpeechPost, POST } from "./route";

const projectKey = "sk-project-secret";
const audio = Uint8Array.from([73, 68, 51, 4]).buffer;

function request(body: string): Request {
  return new Request("http://localhost/api/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("createSpeechPost", () => {
  it("constructs a fifteen-second OpenAI client and preserves the exact speech request", async () => {
    const constructionOptions: unknown[] = [];
    const speechRequests: unknown[] = [];
    const gateway = createOpenAISpeechGateway(projectKey, (options) => {
      constructionOptions.push(options);

      return {
        audio: {
          speech: {
            create: async (request) => {
              speechRequests.push(request);
              return { arrayBuffer: async () => audio };
            },
          },
        },
      };
    });

    await expect(
      gateway.create({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: "State a clear goal.",
        responseFormat: "mp3",
      }),
    ).resolves.toBe(audio);

    expect(constructionOptions).toEqual([{ apiKey: projectKey, timeout: 15_000, maxRetries: 0 }]);
    expect(speechRequests).toEqual([
      {
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: "State a clear goal.",
        response_format: "mp3",
      },
    ]);
  });

  it("returns approved mp3 hint audio without caching or exposing the project key", async () => {
    const calls: HintKey[] = [];
    const post = createSpeechPost({
      createHintSpeech: async (hintKey) => {
        calls.push(hintKey);
        return audio;
      },
    });

    const response = await post(request('{"hintKey":"requireClearSign"}'));
    const responseBytes = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-AI-Generated-Voice")).toBe("true");
    expect(calls).toEqual(["requireClearSign"]);
    expect(Array.from(new Uint8Array(responseBytes))).toEqual([73, 68, 51, 4]);
    expect(new TextDecoder().decode(responseBytes)).not.toContain(projectKey);
  });

  it("rejects a streamed oversized JSON body without invoking speech generation", async () => {
    let created = false;
    const post = createSpeechPost({ createHintSpeech: async () => {
      created = true;
      return audio;
    }});
    let cancelled = false;
    const chunks = [
      new TextEncoder().encode('{"hintKey":"requireClearSign"}'),
      new Uint8Array(2_000),
    ];
    const response = await post({
      headers: new Headers({ "content-type": "application/json" }),
      body: new ReadableStream<Uint8Array>({
        pull(controller) {
          const chunk = chunks.shift();
          if (chunk === undefined) {
            controller.close();
            return;
          }
          controller.enqueue(chunk);
        },
        cancel() {
          cancelled = true;
        },
      }, { highWaterMark: 0 }),
    } as unknown as Request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(created).toBe(false);
    expect(cancelled).toBe(true);
  });

  it.each([
    ["malformed JSON", "{not-json"],
    ["an unknown hint key", '{"hintKey":"madeUpHint"}'],
  ])("returns invalid_request for %s", async (_name, body) => {
    const post = createSpeechPost({ createHintSpeech: async () => audio });

    const response = await post(request(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
  });

  it("returns speech_unavailable when the speech gateway fails", async () => {
    const post = createSpeechPost({
      createHintSpeech: async () => Promise.reject(new Error(projectKey)),
    });

    const response = await post(request('{"hintKey":"requireClearSign"}'));
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ error: "speech_unavailable" });
    expect(body).not.toContain(projectKey);
  });

  it("returns service_unavailable from the production handler when the project key is absent", async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const response = await POST(request('{"hintKey":"requireClearSign"}'));

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ error: "service_unavailable" });
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }
    }
  });
});
