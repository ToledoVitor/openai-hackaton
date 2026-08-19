export const MAX_TIMEOUT_MS = 60_000;

export interface TimeoutScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface TimeoutOptions {
  controller?: AbortController;
  scheduler?: TimeoutScheduler;
}

export class UpstreamTimeoutError extends Error {
  readonly code = "UPSTREAM_TIMEOUT";

  constructor() {
    super("Upstream operation timed out.");
    this.name = "UpstreamTimeoutError";
  }
}

const systemScheduler: TimeoutScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T> | T,
  timeoutMs: number,
  { controller = new AbortController(), scheduler = systemScheduler }: TimeoutOptions = {},
): Promise<T> {
  validateTimeout(timeoutMs);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = { handle: undefined as unknown | undefined };
    const clearTimer = () => {
      if (timer.handle !== undefined) {
        scheduler.clearTimeout(timer.handle);
      }
    };
    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimer();
      callback();
    };

    timer.handle = scheduler.setTimeout(() => {
      settle(() => {
        controller.abort();
        reject(new UpstreamTimeoutError());
      });
    }, timeoutMs);

    if (settled) {
      clearTimer();
      return;
    }

    Promise.resolve().then(() => operation(controller.signal)).then(
      (value) => settle(() => resolve(value)),
      (error: unknown) => settle(() => reject(error)),
    );
  });
}

function validateTimeout(timeoutMs: number): void {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new RangeError("timeoutMs must be a positive safe integer within the supported range.");
  }
}
