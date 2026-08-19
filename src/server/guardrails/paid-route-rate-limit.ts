import { FixedWindowRateLimiter, rateLimitResponse } from "./rate-limiter";

const PAID_ROUTE_LIMITS = {
  "/api/evaluate": 10,
  "/api/realtime-token": 5,
  "/api/speech": 10,
} as const;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS_PER_ROUTE = 10_000;
const MAX_CLIENT_ADDRESS_LENGTH = 64;
const UNKNOWN_CLOUDFLARE_CLIENT_KEY = "cf:unknown";
const IPV4_ADDRESS = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_ADDRESS = /^[0-9a-fA-F:]+$/;

type PaidRoutePath = keyof typeof PAID_ROUTE_LIMITS;
type CloudflareRequest = Request & { cf?: unknown };

export interface PaidRouteRateLimitGuardOptions {
  now?: () => number;
}

/**
 * Applies the public paid-route quotas at the Cloudflare Worker boundary.
 *
 * `cf-connecting-ip` is accepted only from a Worker request with platform
 * `request.cf` metadata. Local and non-Cloudflare requests deliberately bypass
 * this guard: the application routes must never collapse callers into a global
 * anonymous bucket.
 */
export function createPaidRouteRateLimitGuard(
  { now = Date.now }: PaidRouteRateLimitGuardOptions = {},
): (request: Request) => Response | undefined {
  const limiters = new Map<PaidRoutePath, FixedWindowRateLimiter>(
    Object.entries(PAID_ROUTE_LIMITS).map(([path, limit]) => [
      path as PaidRoutePath,
      new FixedWindowRateLimiter({
        limit,
        windowMs: RATE_LIMIT_WINDOW_MS,
        maxKeys: MAX_TRACKED_CLIENTS_PER_ROUTE,
        now,
      }),
    ]),
  );

  return (request) => {
    const path = new URL(request.url).pathname as PaidRoutePath;
    const limiter = limiters.get(path);
    const clientKey = cloudflareClientKey(request);

    if (request.method !== "POST" || limiter === undefined || clientKey === undefined) {
      return undefined;
    }

    return rateLimitResponse(limiter.consume(clientKey));
  };
}

function cloudflareClientKey(request: Request): string | undefined {
  if (!hasCloudflareMetadata(request)) {
    return undefined;
  }

  const clientAddress = request.headers.get("cf-connecting-ip");
  if (clientAddress === null || !isValidClientAddress(clientAddress)) {
    return UNKNOWN_CLOUDFLARE_CLIENT_KEY;
  }

  return `cf:${clientAddress}`;
}

function hasCloudflareMetadata(request: Request): boolean {
  const metadata = (request as CloudflareRequest).cf;

  return typeof metadata === "object" && metadata !== null;
}

function isValidClientAddress(value: string): boolean {
  if (value.length === 0 || value.length > MAX_CLIENT_ADDRESS_LENGTH || value.trim() !== value) {
    return false;
  }

  if (IPV4_ADDRESS.test(value)) {
    return true;
  }

  return value.includes(":") && IPV6_ADDRESS.test(value);
}
