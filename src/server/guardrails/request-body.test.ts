import { describe, expect, it } from "vitest";

import { RequestBodyError, readJsonWithLimit } from "./request-body";

function jsonRequest(body: string, headers: HeadersInit = {}): Request {
  return new Request("https://city.example/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("readJsonWithLimit", () => {
  it("reads an object at the exact byte limit", async () => {
    const body = '{"a":1}';

    await expect(readJsonWithLimit(jsonRequest(body), new TextEncoder().encode(body).byteLength)).resolves.toEqual({
      a: 1,
    });
  });

  it("measures UTF-8 bytes rather than JavaScript character length", async () => {
    const body = '{"city":"São"}';
    const bytes = new TextEncoder().encode(body).byteLength;

    await expect(readJsonWithLimit(jsonRequest(body), bytes - 1)).rejects.toMatchObject({
      code: "BODY_TOO_LARGE",
    });
    await expect(readJsonWithLimit(jsonRequest(body), bytes)).resolves.toEqual({ city: "São" });
  });

  it("rejects missing or non-JSON content types with a stable redacted code", async () => {
    const missingContentType = new Request("https://city.example/api/evaluate", { method: "POST", body: "{}" });

    await expect(readJsonWithLimit(missingContentType, 10)).rejects.toMatchObject({
      code: "UNSUPPORTED_CONTENT_TYPE",
    });
    await expect(readJsonWithLimit(jsonRequest("{}", { "content-type": "text/plain" }), 10)).rejects.toMatchObject({
      code: "UNSUPPORTED_CONTENT_TYPE",
    });
  });

  it("rejects an oversized declared content length before parsing", async () => {
    await expect(readJsonWithLimit(jsonRequest("{}", { "content-length": "3" }), 2)).rejects.toMatchObject({
      code: "CONTENT_LENGTH_EXCEEDED",
    });
  });

  it("rejects an actually oversized body even when its declared length is small", async () => {
    const body = '{"mayor":"city"}';

    await expect(readJsonWithLimit(jsonRequest(body, { "content-length": "1" }), 1)).rejects.toMatchObject({
      code: "BODY_TOO_LARGE",
    });
  });

  it.each([
    ["an empty body", "", "EMPTY_BODY"],
    ["malformed JSON", '{"private":"do not reveal"', "INVALID_JSON"],
    ["an array", "[]", "JSON_OBJECT_REQUIRED"],
    ["null", "null", "JSON_OBJECT_REQUIRED"],
  ])("rejects %s with a stable error code", async (_name, body, code) => {
    await expect(readJsonWithLimit(jsonRequest(body), 100)).rejects.toMatchObject({ code });
  });

  it("does not include request body or JSON parse details in errors", async () => {
    const secret = "city-secret-never-echo";

    await expect(readJsonWithLimit(jsonRequest(`{"secret":"${secret}"`), 100)).rejects.toMatchObject({
      code: "INVALID_JSON",
    });
    await readJsonWithLimit(jsonRequest(`{"secret":"${secret}"`), 100).catch((error: unknown) => {
      expect(error).toBeInstanceOf(RequestBodyError);
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).not.toContain("Unexpected end");
    });
  });

  it("redacts failures while reading a request body", async () => {
    const secret = "city-stream-secret-never-echo";
    const unreadableRequest = {
      headers: new Headers({ "content-type": "application/json" }),
      arrayBuffer: () => Promise.reject(new Error(secret)),
    } as unknown as Request;

    await expect(readJsonWithLimit(unreadableRequest, 100)).rejects.toMatchObject({ code: "BODY_READ_FAILED" });
    await readJsonWithLimit(unreadableRequest, 100).catch((error: unknown) => {
      expect((error as Error).message).not.toContain(secret);
    });
  });

  it("rejects an unsafe configured byte limit", async () => {
    await expect(readJsonWithLimit(jsonRequest("{}"), 0)).rejects.toThrow(RangeError);
    await expect(readJsonWithLimit(jsonRequest("{}"), 1_000_001)).rejects.toThrow(RangeError);
  });
});
