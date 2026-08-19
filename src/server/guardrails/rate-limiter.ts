const MAX_KEY_LENGTH = 256;

export interface FixedWindowRateLimiterOptions {
  limit: number;
  windowMs: number;
  maxKeys: number;
  now?: () => number;
}

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfterMs: number };

interface WindowEntry {
  count: number;
  startedAt: number;
  order: number;
}

/**
 * Process-local limiting is best-effort only. Provider and project spend caps
 * remain mandatory safeguards for every deployment.
 */
export class FixedWindowRateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #maxKeys: number;
  readonly #now: () => number;
  readonly #entries = new Map<string, WindowEntry>();
  #nextOrder = 0;

  constructor({ limit, windowMs, maxKeys, now = Date.now }: FixedWindowRateLimiterOptions) {
    validatePositiveInteger(limit, "limit");
    validatePositiveInteger(windowMs, "windowMs");
    validatePositiveInteger(maxKeys, "maxKeys");

    this.#limit = limit;
    this.#windowMs = windowMs;
    this.#maxKeys = maxKeys;
    this.#now = now;
  }

  consume(key: string): RateLimitDecision {
    validateKey(key);
    const now = this.#readNow();
    this.#evictExpired(now);

    let entry = this.#entries.get(key);
    if (entry === undefined) {
      this.#evictForCapacity();
      entry = { count: 0, startedAt: now, order: this.#nextOrder++ };
      this.#entries.set(key, entry);
    }

    if (entry.count >= this.#limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1, entry.startedAt + this.#windowMs - now),
      };
    }

    entry.count += 1;
    return { allowed: true, remaining: this.#limit - entry.count };
  }

  #readNow(): number {
    const now = this.#now();
    if (!Number.isFinite(now)) {
      throw new RangeError("The rate-limit clock must return a finite timestamp.");
    }
    return now;
  }

  #evictExpired(now: number): void {
    for (const [key, entry] of this.#entries) {
      if (now - entry.startedAt >= this.#windowMs) {
        this.#entries.delete(key);
      }
    }
  }

  #evictForCapacity(): void {
    if (this.#entries.size < this.#maxKeys) {
      return;
    }

    let oldestKey: string | undefined;
    let oldestOrder = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.#entries) {
      if (entry.order < oldestOrder) {
        oldestKey = key;
        oldestOrder = entry.order;
      }
    }
    if (oldestKey !== undefined) {
      this.#entries.delete(oldestKey);
    }
  }
}

function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

function validateKey(key: string): void {
  if (typeof key !== "string" || key.trim().length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new TypeError("Rate-limit keys must be non-blank and within the supported length.");
  }
}
