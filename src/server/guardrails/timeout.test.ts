import { describe, expect, it } from "vitest";

import { UpstreamTimeoutError, withTimeout } from "./timeout";

class ManualScheduler {
  readonly cleared: unknown[] = [];
  private callback: (() => void) | undefined;
  private nextHandle = 0;

  setTimeout(callback: () => void): number {
    this.callback = callback;
    this.nextHandle += 1;
    return this.nextHandle;
  }

  clearTimeout(handle: unknown): void {
    this.cleared.push(handle);
  }

  elapse(): void {
    this.callback?.();
  }
}

describe("withTimeout", () => {
  it("resolves an operation before its deadline and clears its timer", async () => {
    const scheduler = new ManualScheduler();

    await expect(withTimeout(() => Promise.resolve("restored"), 25, { scheduler })).resolves.toBe("restored");
    expect(scheduler.cleared).toEqual([1]);
  });

  it("aborts at the deadline and rejects with a stable typed error", async () => {
    const scheduler = new ManualScheduler();
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const pending = withTimeout(
      (signal) => {
        receivedSignal = signal;
        return new Promise<string>(() => undefined);
      },
      25,
      { controller, scheduler },
    );

    await Promise.resolve();
    scheduler.elapse();

    await expect(pending).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT", name: "UpstreamTimeoutError" });
    expect(receivedSignal).toBe(controller.signal);
    expect(controller.signal.aborted).toBe(true);
    expect(scheduler.cleared).toEqual([1]);
  });

  it("preserves an operation error and clears its timer", async () => {
    const scheduler = new ManualScheduler();
    const failure = new Error("upstream unavailable");

    await expect(withTimeout(() => Promise.reject(failure), 25, { scheduler })).rejects.toBe(failure);
    expect(scheduler.cleared).toEqual([1]);
  });

  it("handles an operation rejection after timeout without reporting an unhandled rejection", async () => {
    const scheduler = new ManualScheduler();
    let rejectLate!: (reason: Error) => void;
    const lateOperation = new Promise<string>((_resolve, reject) => {
      rejectLate = reject;
    });
    const pending = withTimeout(() => lateOperation, 25, { scheduler });

    await Promise.resolve();
    scheduler.elapse();
    await expect(pending).rejects.toBeInstanceOf(UpstreamTimeoutError);

    expect(() => rejectLate(new Error("private upstream details"))).not.toThrow();
    await Promise.resolve();
  });

  it("handles an immediately firing injected timer without starting the operation", async () => {
    const scheduler = {
      setTimeout(callback: () => void): number {
        callback();
        return 1;
      },
      clearTimeout(): void {},
    };
    let operationCalls = 0;

    const pending = withTimeout(
      () => {
        operationCalls += 1;
        return Promise.resolve("too late");
      },
      25,
      { scheduler },
    );

    await expect(pending).rejects.toBeInstanceOf(UpstreamTimeoutError);
    expect(operationCalls).toBe(0);
  });

  it("rejects timeout values outside the safe positive range", () => {
    expect(() => withTimeout(() => Promise.resolve(), 0)).toThrow(RangeError);
    expect(() => withTimeout(() => Promise.resolve(), 60_001)).toThrow(RangeError);
  });
});
