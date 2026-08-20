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
  const candidateX = { x: clampX(current.x + direction.x * distance), z: current.z };
  if (!blocked(candidateX, bounds.obstacles)) next = candidateX;
  const candidateZ = { x: next.x, z: clampZ(current.z + direction.z * distance) };
  if (!blocked(candidateZ, bounds.obstacles)) next = candidateZ;
  return next;
}
