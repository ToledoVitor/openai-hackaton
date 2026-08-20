import type { ExplorerObstacle } from './exploration';

export type BuildingPlacement = {
  x: number;
  z: number;
  scale: number;
  rotationY: 0 | typeof HALF_TURN | typeof QUARTER_TURN | typeof NEGATIVE_QUARTER_TURN;
  modelIndex: number;
};

export type PassiveDecorPlacement = {
  kind: 'bench' | 'bush' | 'streetlight' | 'bus_stop';
  x: number;
  z: number;
  rotationY: number;
};

const QUARTER_TURN = Math.PI / 2;
const NEGATIVE_QUARTER_TURN = -Math.PI / 2;
const HALF_TURN = Math.PI;

export const MISSION_EXCLUSION_ZONES: readonly ExplorerObstacle[] = [
  { minX: -13, maxX: -3, minZ: 3, maxZ: 12 },
  { minX: 9.5, maxX: 18.5, minZ: -2, maxZ: 7 },
  { minX: 9, maxX: 17.5, minZ: 7.5, maxZ: 12 },
];

export const BUILDING_PLACEMENTS: readonly BuildingPlacement[] = [
  { x: -16, z: -8.2, scale: 2.15, rotationY: 0, modelIndex: 0 },
  { x: -10.5, z: -8.7, scale: 2.05, rotationY: HALF_TURN, modelIndex: 2 },
  { x: -4.8, z: -8.1, scale: 2.25, rotationY: 0, modelIndex: 4 },
  { x: 1, z: -8.7, scale: 2.1, rotationY: HALF_TURN, modelIndex: 5 },
  { x: 11.5, z: -9.5, scale: 2.15, rotationY: QUARTER_TURN, modelIndex: 1 },
  { x: 17.2, z: -9.2, scale: 2.05, rotationY: NEGATIVE_QUARTER_TURN, modelIndex: 3 },
  { x: -16.5, z: -27, scale: 2.1, rotationY: 0, modelIndex: 0 },
  { x: -10.5, z: -27.2, scale: 2, rotationY: HALF_TURN, modelIndex: 1 },
  { x: -4.2, z: -27, scale: 2.2, rotationY: 0, modelIndex: 2 },
  { x: 1.3, z: -27.1, scale: 1.9, rotationY: HALF_TURN, modelIndex: 3 },
  { x: -16.5, z: -34, scale: 2, rotationY: HALF_TURN, modelIndex: 4 },
  { x: -10.5, z: -34.2, scale: 2.15, rotationY: 0, modelIndex: 5 },
  { x: -4.2, z: -34, scale: 1.95, rotationY: HALF_TURN, modelIndex: 6 },
  { x: 1.3, z: -34.1, scale: 2.1, rotationY: 0, modelIndex: 7 },
  { x: 12.3, z: -27, scale: 2.15, rotationY: 0, modelIndex: 0 },
  { x: 19, z: -27.2, scale: 2, rotationY: HALF_TURN, modelIndex: 2 },
  { x: 12.3, z: -34, scale: 2, rotationY: HALF_TURN, modelIndex: 4 },
  { x: 19, z: -34.1, scale: 2.15, rotationY: 0, modelIndex: 6 },
  { x: 31.2, z: -27, scale: 2.2, rotationY: 0, modelIndex: 1 },
  { x: 36.4, z: -26.8, scale: 1.9, rotationY: HALF_TURN, modelIndex: 3 },
  { x: 31.2, z: -34, scale: 2, rotationY: HALF_TURN, modelIndex: 5 },
  { x: 36.4, z: -34, scale: 2.1, rotationY: 0, modelIndex: 7 },
  { x: -32, z: -11.4, scale: 2.15, rotationY: QUARTER_TURN, modelIndex: 0 },
  { x: -32, z: -5.2, scale: 2, rotationY: NEGATIVE_QUARTER_TURN, modelIndex: 2 },
  { x: 33, z: -11.4, scale: 2.2, rotationY: NEGATIVE_QUARTER_TURN, modelIndex: 4 },
  { x: 33, z: -5.2, scale: 1.95, rotationY: QUARTER_TURN, modelIndex: 6 },
  { x: -32, z: 5.6, scale: 2.1, rotationY: QUARTER_TURN, modelIndex: 1 },
  { x: -32, z: 12, scale: 2, rotationY: NEGATIVE_QUARTER_TURN, modelIndex: 3 },
  { x: 19.5, z: 10.5, scale: 2.05, rotationY: QUARTER_TURN, modelIndex: 5 },
  { x: -35, z: 27, scale: 2.1, rotationY: HALF_TURN, modelIndex: 0 },
  { x: -29.5, z: 27, scale: 2, rotationY: 0, modelIndex: 1 },
  { x: -35, z: 34, scale: 2, rotationY: 0, modelIndex: 2 },
  { x: -29.5, z: 34, scale: 2.15, rotationY: HALF_TURN, modelIndex: 3 },
  { x: -16.2, z: 27, scale: 2, rotationY: HALF_TURN, modelIndex: 4 },
  { x: -9.7, z: 27.2, scale: 2.2, rotationY: 0, modelIndex: 5 },
  { x: -3.2, z: 27, scale: 1.95, rotationY: HALF_TURN, modelIndex: 6 },
  { x: -16.2, z: 34, scale: 2.15, rotationY: 0, modelIndex: 7 },
  { x: -9.7, z: 34.2, scale: 1.95, rotationY: HALF_TURN, modelIndex: 0 },
  { x: -3.2, z: 34, scale: 2.1, rotationY: 0, modelIndex: 2 },
  { x: 31.5, z: 27, scale: 2.1, rotationY: HALF_TURN, modelIndex: 4 },
  { x: 36.5, z: 26.8, scale: 1.9, rotationY: 0, modelIndex: 5 },
  { x: 31.5, z: 34, scale: 2, rotationY: 0, modelIndex: 6 },
  { x: 36.5, z: 34, scale: 2.15, rotationY: HALF_TURN, modelIndex: 7 },
];

export const PASSIVE_DECOR_PLACEMENTS: readonly PassiveDecorPlacement[] = [
  { kind: 'bus_stop', x: -14, z: -13.6, rotationY: 0 },
  { kind: 'bench', x: -8, z: -13.4, rotationY: HALF_TURN },
  { kind: 'bush', x: -5.8, z: -13.4, rotationY: 0 },
  { kind: 'bus_stop', x: 18.8, z: -13.6, rotationY: 0 },
  { kind: 'streetlight', x: -18.5, z: 13.7, rotationY: 0 },
  { kind: 'bench', x: -15.8, z: 13.5, rotationY: HALF_TURN },
  { kind: 'bush', x: -13.8, z: 13.4, rotationY: 0 },
  { kind: 'bus_stop', x: 31, z: 14.1, rotationY: HALF_TURN },
];

export const EXPLORER_OBSTACLES: readonly ExplorerObstacle[] = [
  ...MISSION_EXCLUSION_ZONES.slice(0, 2),
  { minX: -19, maxX: 4, minZ: -12, maxZ: -5 },
  { minX: 9, maxX: 20, minZ: -13, maxZ: -5 },
  { minX: -37, maxX: -27, minZ: -14, maxZ: 14 },
  { minX: 30, maxX: 38, minZ: -14, maxZ: -3 },
  { minX: 18, maxX: 22, minZ: 8, maxZ: 13 },
  { minX: -19, maxX: 4, minZ: -36, maxZ: -25 },
  { minX: 9, maxX: 21, minZ: -36, maxZ: -25 },
  { minX: 28, maxX: 38, minZ: -36, maxZ: -25 },
  { minX: -37, maxX: -27, minZ: 25, maxZ: 36 },
  { minX: -19, maxX: 0, minZ: 25, maxZ: 36 },
  { minX: 29, maxX: 38, minZ: 25, maxZ: 36 },
];
