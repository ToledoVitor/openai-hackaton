import { describe, expect, it } from "vitest";

import { moveExplorer, movementFromKeys, type ExplorerBounds } from "./exploration";

const bounds: ExplorerBounds = {
  minX: -10,
  maxX: 10,
  minZ: -8,
  maxZ: 8,
  obstacles: [{ minX: 1, maxX: 3, minZ: 1, maxZ: 3 }],
};

describe("city exploration", () => {
  it("maps WASD and arrows to normalized direct movement", () => {
    expect(movementFromKeys(new Set(["w", "ArrowRight"]))).toEqual({ x: 0.7071067811865475, z: -0.7071067811865475 });
    expect(movementFromKeys(new Set(["s", "ArrowUp"]))).toEqual({ x: 0, z: 0 });
  });

  it("clamps movement inside useful city boundaries", () => {
    expect(moveExplorer({ x: 9.5, z: 7.5 }, { x: 1, z: 1 }, 2, bounds)).toEqual({ x: 10, z: 8 });
  });

  it("rejects obstacle overlap while preserving free-axis movement", () => {
    expect(moveExplorer({ x: 0, z: 2 }, { x: 1, z: 1 }, 2, bounds)).toEqual({ x: 0, z: 4 });
  });
});
