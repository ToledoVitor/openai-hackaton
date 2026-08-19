import { describe, expect, it } from "vitest";

import { createPaidRouteRateLimitGuard } from "./paid-route-rate-limit";

function request(
  pathname: string,
  options: { cf?: object; connectingIp?: string; method?: string } = {},
): Request {
  const request = new Request(`https://example.test${pathname}`, {
    method: options.method ?? "POST",
    headers: options.connectingIp === undefined ? undefined : { "cf-connecting-ip": options.connectingIp },
  });

  if (options.cf !== undefined) {
    Object.defineProperty(request, "cf", { value: options.cf });
  }

  return request;
}

describe("createPaidRouteRateLimitGuard", () => {
  it("bypasses local requests even when an attacker supplies forwarding headers", () => {
    const guard = createPaidRouteRateLimitGuard();

    for (let index = 0; index < 20; index += 1) {
      expect(guard(request("/api/evaluate", { connectingIp: `203.0.113.${index}` }))).toBeUndefined();
    }
  });

  it("uses independent Cloudflare client buckets and returns a redacted 429", async () => {
    const guard = createPaidRouteRateLimitGuard();

    for (let index = 0; index < 10; index += 1) {
      expect(guard(request("/api/evaluate", { cf: {}, connectingIp: "203.0.113.10" }))).toBeUndefined();
    }

    const blocked = guard(request("/api/evaluate", { cf: {}, connectingIp: "203.0.113.10" }));
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("60");
    const body = await blocked?.text();
    expect(JSON.parse(body ?? "")).toEqual({ error: "rate_limited" });
    expect(body).not.toContain("203.0.113.10");

    expect(guard(request("/api/evaluate", { cf: {}, connectingIp: "203.0.113.11" }))).toBeUndefined();
  });

  it("applies the 10, 5, and 10 request quotas in independent paid-route buckets", () => {
    const guard = createPaidRouteRateLimitGuard();
    const client = { cf: {}, connectingIp: "2001:db8::1" };

    for (let index = 0; index < 10; index += 1) {
      expect(guard(request("/api/evaluate", client))).toBeUndefined();
      expect(guard(request("/api/speech", client))).toBeUndefined();
    }
    for (let index = 0; index < 5; index += 1) {
      expect(guard(request("/api/realtime-token", client))).toBeUndefined();
    }

    expect(guard(request("/api/evaluate", client))?.status).toBe(429);
    expect(guard(request("/api/speech", client))?.status).toBe(429);
    expect(guard(request("/api/realtime-token", client))?.status).toBe(429);
  });

  it("uses an internal fallback bucket for malformed platform identity without blocking valid clients", () => {
    const guard = createPaidRouteRateLimitGuard();

    for (let index = 0; index < 10; index += 1) {
      expect(guard(request("/api/evaluate", { cf: {}, connectingIp: "not an address" }))).toBeUndefined();
    }
    expect(guard(request("/api/evaluate", { cf: {}, connectingIp: "not an address" }))?.status).toBe(429);

    expect(guard(request("/api/evaluate", { cf: {}, connectingIp: "203.0.113.12" }))).toBeUndefined();
  });

  it("does not consume paid route buckets for GET or HEAD requests", () => {
    const guard = createPaidRouteRateLimitGuard();
    const client = { cf: {}, connectingIp: "203.0.113.13" };

    for (let index = 0; index < 20; index += 1) {
      expect(guard(request("/api/evaluate", { ...client, method: "GET" }))).toBeUndefined();
      expect(guard(request("/api/evaluate", { ...client, method: "HEAD" }))).toBeUndefined();
    }

    for (let index = 0; index < 10; index += 1) {
      expect(guard(request("/api/evaluate", client))).toBeUndefined();
    }
    expect(guard(request("/api/evaluate", client))?.status).toBe(429);
  });

  it("bypasses non-paid paths without retaining a caller identity", () => {
    const guard = createPaidRouteRateLimitGuard();

    expect(guard(request("/api/other", { cf: {}, connectingIp: "203.0.113.10" }))).toBeUndefined();
    expect(guard(request("/", { cf: {}, connectingIp: "203.0.113.10" }))).toBeUndefined();
  });
});
