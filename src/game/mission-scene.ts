import type { LearningMissionId } from "../domain/learning-journey";

type CameraPoint = readonly [x: number, y: number, z: number];
type GroundPoint = readonly [x: number, z: number];
type CharacterPoint = readonly [x: number, z: number, rotationY: number];

export type MissionSceneLocation = {
  cameraPosition: CameraPoint;
  cameraTarget: CameraPoint;
  highlight: GroundPoint;
  characters: readonly [CharacterPoint, CharacterPoint];
};

export const MISSION_SCENE_LOCATIONS: Readonly<Record<LearningMissionId, MissionSceneLocation>> = {
  apartment_construction: {
    cameraPosition: [8, 10, 21],
    cameraTarget: [-8, 1.2, 7],
    highlight: [-8, 7],
    characters: [[-9.7, 10.7, 0.05], [-7.3, 10.65, -0.05]],
  },
  hospital_construction: {
    cameraPosition: [27, 11, 18],
    cameraTarget: [14, 1, 2],
    highlight: [14, 2],
    characters: [[12.7, 4.8, 0.2], [15, 4.7, -0.2]],
  },
  urban_repair: {
    cameraPosition: [27, 12, 23],
    cameraTarget: [12.5, 1, 2.3],
    highlight: [12.5, 2.3],
    characters: [[11.7, 7.8, Math.PI], [14.3, -3.2, 0]],
  },
};

export function urbanProblemRemains(decisions: readonly string[]): boolean {
  return !decisions.includes("urban_repair") && !decisions.includes("limpeza");
}
