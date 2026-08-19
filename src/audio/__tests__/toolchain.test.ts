import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("audio toolchain", () => {
  it("runs TypeScript tests on supported Node", () => {
    expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(22);
  });

  it("uses Vite that supports Node 22.0", () => {
    const vitePackage = JSON.parse(
      readFileSync(new URL("../../../node_modules/vite/package.json", import.meta.url), "utf8"),
    ) as { engines: { node: string }; version: string };

    expect(vitePackage.version).toMatch(/^6\./);
    expect(vitePackage.engines.node).toBe("^18.0.0 || ^20.0.0 || >=22.0.0");
  });
});
