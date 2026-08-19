import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "./rate-limiter";

describe("FixedWindowRateLimiter", () => {
  it("allows exactly the configured number of requests and reports the retry delay", () => {
    let now = 1_000;
    const limiter = new FixedWindowRateLimiter({
      limit: 2,
      windowMs: 100,
      maxKeys: 3,
      now: () => now,
    });

    expect(limiter.consume("anonymous")).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.consume("anonymous")).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.consume("anonymous")).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 100,
    });

    now = 1_099;
    expect(limiter.consume("anonymous")).toMatchObject({ allowed: false, retryAfterMs: 1 });
  });

  it("resets a key at the fixed-window boundary", () => {
    let now = 500;
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 50,
      maxKeys: 2,
      now: () => now,
    });

    limiter.consume("mayor");
    now = 550;

    expect(limiter.consume("mayor")).toEqual({ allowed: true, remaining: 0 });
  });

  it("keeps each key in an independent window", () => {
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 100, maxKeys: 2, now: () => 0 });

    expect(limiter.consume("first")).toMatchObject({ allowed: true });
    expect(limiter.consume("second")).toMatchObject({ allowed: true });
    expect(limiter.consume("first")).toMatchObject({ allowed: false });
  });

  it("removes expired keys before evicting a live key at capacity", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 10,
      maxKeys: 2,
      now: () => now,
    });

    limiter.consume("expired");
    now = 5;
    limiter.consume("live");
    now = 10;
    limiter.consume("new");

    expect(limiter.consume("live")).toMatchObject({ allowed: false });
  });

  it("deterministically evicts the oldest live key when capacity remains full", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 100,
      maxKeys: 2,
      now: () => now,
    });

    limiter.consume("oldest");
    now = 1;
    limiter.consume("newer");
    now = 2;
    limiter.consume("latest");

    expect(limiter.consume("newer")).toEqual({ allowed: false, remaining: 0, retryAfterMs: 99 });
    expect(limiter.consume("oldest")).toEqual({ allowed: true, remaining: 0 });
  });

  it("rejects invalid configuration and blank or oversized keys without exposing a key", () => {
    expect(() => new FixedWindowRateLimiter({ limit: 0, windowMs: 1, maxKeys: 1 })).toThrow(RangeError);
    expect(() => new FixedWindowRateLimiter({ limit: 1, windowMs: 0, maxKeys: 1 })).toThrow(RangeError);
    expect(() => new FixedWindowRateLimiter({ limit: 1, windowMs: 1, maxKeys: 0 })).toThrow(RangeError);

    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1, maxKeys: 1 });
    expect(() => limiter.consume("   ")).toThrow(TypeError);
    expect(() => limiter.consume("secret-key-" + "x".repeat(257))).toThrow(TypeError);
    expect(() => limiter.consume("secret-key-" + "x".repeat(257))).not.toThrow(/secret-key/);
  });

  it("returns only decision metadata and never a stored key", () => {
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 100, maxKeys: 1 });

    const result = limiter.consume("private-installation-id");

    expect(Object.values(result)).not.toContain("private-installation-id");
    expect(Object.keys(limiter)).not.toContain("entries");
  });
});
