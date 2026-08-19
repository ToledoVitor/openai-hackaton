export type AmbienceAsset = {
  id: string;
  src: string;
  weight: number;
  maxPlaybackMs: number;
};

export const MUSIC_ASSET = {
  id: "cozy-city-loop",
  src: "/audio/music/cozy-city-loop.ogg",
} as const;

export const AMBIENCE_ASSETS: readonly AmbienceAsset[] = [
  { id: "birds", src: "/audio/sfx/birds.ogg", weight: 3, maxPlaybackMs: 6_000 },
  { id: "footsteps", src: "/audio/sfx/footsteps.ogg", weight: 4, maxPlaybackMs: 2_000 },
  { id: "bicycle-bell", src: "/audio/sfx/bicycle-bell.ogg", weight: 2, maxPlaybackMs: 2_000 },
  { id: "crosswalk-beep", src: "/audio/sfx/crosswalk-beep.wav", weight: 2, maxPlaybackMs: 2_000 },
  { id: "distant-traffic", src: "/audio/sfx/distant-traffic.ogg", weight: 1, maxPlaybackMs: 6_000 },
] as const;
