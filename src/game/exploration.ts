export type ExplorerPoint = { x: number; z: number };
export type ExplorerObstacle = { minX: number; maxX: number; minZ: number; maxZ: number };
export type ExplorerBounds = ExplorerObstacle & { obstacles: readonly ExplorerObstacle[] };

function blocked(point: ExplorerPoint, obstacles: readonly ExplorerObstacle[]): boolean {
  return obstacles.some((obstacle) =>
    point.x >= obstacle.minX && point.x <= obstacle.maxX &&
    point.z >= obstacle.minZ && point.z <= obstacle.maxZ,
  );
}

export function movementFromKeys(keys: ReadonlySet<string>): ExplorerPoint {
  const x = Number(keys.has("d") || keys.has("ArrowRight")) - Number(keys.has("a") || keys.has("ArrowLeft"));
  const z = Number(keys.has("s") || keys.has("ArrowDown")) - Number(keys.has("w") || keys.has("ArrowUp"));
  const length = Math.hypot(x, z);
  return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

export function moveExplorer(
  current: ExplorerPoint,
  direction: ExplorerPoint,
  distance: number,
  bounds: ExplorerBounds,
): ExplorerPoint {
  const clampX = (x: number) => Math.min(bounds.maxX, Math.max(bounds.minX, x));
  const clampZ = (z: number) => Math.min(bounds.maxZ, Math.max(bounds.minZ, z));
  let next = { ...current };

  const moveAxis = (axis: "x" | "z", delta: number): boolean => {
    const origin = next[axis];
    const target = axis === "x" ? clampX(origin + delta) : clampZ(origin + delta);
    const steps = Math.max(1, Math.ceil(Math.abs(target - origin) / 0.25));
    for (let step = 1; step <= steps; step += 1) {
      const candidate = { ...next, [axis]: origin + ((target - origin) * step) / steps };
      if (blocked(candidate, bounds.obstacles)) return false;
    }
    next = { ...next, [axis]: target };
    return true;
  };

  moveAxis("x", direction.x * distance);
  moveAxis("z", direction.z * distance);
  return next;
}
