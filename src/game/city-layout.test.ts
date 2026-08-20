import { describe, expect, it } from 'vitest';
import {
  BUILDING_PLACEMENTS,
  EXPLORER_OBSTACLES,
  MISSION_EXCLUSION_ZONES,
  PASSIVE_DECOR_PLACEMENTS,
} from './city-layout';
import { MISSION_SCENE_LOCATIONS } from './mission-scene';

const inside = (x: number, z: number, zone: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ;

describe('deterministic city layout', () => {
  it('keeps street-facing buildings and passive decor outside mission zones', () => {
    const allowedRotations = new Set([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    for (const placement of BUILDING_PLACEMENTS) {
      expect(allowedRotations.has(placement.rotationY)).toBe(true);
      expect(MISSION_EXCLUSION_ZONES.some((zone) => inside(placement.x, placement.z, zone))).toBe(false);
    }
    for (const placement of PASSIVE_DECOR_PLACEMENTS) {
      expect(MISSION_EXCLUSION_ZONES.some((zone) => inside(placement.x, placement.z, zone))).toBe(false);
    }
  });

  it('has unique placements and collision blocks for occupied districts', () => {
    const keys = BUILDING_PLACEMENTS.map(({ x, z }) => `${x}:${z}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(EXPLORER_OBSTACLES.length).toBeGreaterThanOrEqual(5);
    for (const placement of BUILDING_PLACEMENTS) {
      expect(EXPLORER_OBSTACLES.some((zone) => inside(placement.x, placement.z, zone))).toBe(true);
    }
    for (const location of Object.values(MISSION_SCENE_LOCATIONS)) {
      expect(EXPLORER_OBSTACLES.some((zone) => inside(location.explorerStart[0], location.explorerStart[1], zone))).toBe(false);
    }
  });
});
