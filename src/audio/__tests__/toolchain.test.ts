import { describe, expect, it } from "vitest";

describe("audio toolchain", () => {
  it("runs TypeScript tests on supported Node", () => {
    expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(22);
  });
});
