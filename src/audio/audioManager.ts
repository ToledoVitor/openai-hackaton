import { AMBIENCE_ASSETS, MUSIC_ASSET, type AmbienceAsset } from "./catalog";

const STORAGE_KEY = "ai-city-mayor.audio.v2";
const AMBIENCE_BASE_DELAY_MS = 10_000;
const AMBIENCE_RANDOM_SECONDS = 20;
const MUSIC_DUCK_GAIN = 10 ** (-8 / 20);
const AMBIENCE_DUCK_GAIN = 10 ** (-10 / 20);

export type AudioPreferences = {
  muted: boolean;
  musicVolume: number;
  ambienceVolume: number;
};

type AudioLike = {
  loop: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  onended: ((event: Event) => void) | null;
  play(): Promise<void>;
  pause(): void;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type AudioManagerDependencies = {
  createAudio?: (src: string) => AudioLike;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  storage?: StorageLike;
};

export const DEFAULT_AUDIO_PREFERENCES: Readonly<AudioPreferences> = {
  muted: false,
  musicVolume: 0.18,
  ambienceVolume: 0.25,
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function loadPreferences(storage?: StorageLike): AudioPreferences {
  if (!storage) return { ...DEFAULT_AUDIO_PREFERENCES };

  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null") as Partial<AudioPreferences> | null;
    if (!saved) return { ...DEFAULT_AUDIO_PREFERENCES };
    return {
      muted: typeof saved.muted === "boolean" ? saved.muted : false,
      musicVolume: clamp(
        typeof saved.musicVolume === "number" ? saved.musicVolume : DEFAULT_AUDIO_PREFERENCES.musicVolume,
      ),
      ambienceVolume: clamp(
        typeof saved.ambienceVolume === "number" ? saved.ambienceVolume : DEFAULT_AUDIO_PREFERENCES.ambienceVolume,
      ),
    };
  } catch {
    return { ...DEFAULT_AUDIO_PREFERENCES };
  }
}

export function createAudioManager(dependencies: AudioManagerDependencies = {}) {
  const createAudio = dependencies.createAudio ?? ((src: string) => new Audio(src));
  const random = dependencies.random ?? Math.random;
  const setTimer = dependencies.setTimer ?? setTimeout;
  const clearTimer = dependencies.clearTimer ?? clearTimeout;
  const storage = dependencies.storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  const preferences = loadPreferences(storage);
  const music = createAudio(MUSIC_ASSET.src);
  music.loop = true;

  let started = false;
  let voiceDepth = 0;
  let ambienceTimer: ReturnType<typeof setTimeout> | undefined;
  let cutoffTimer: ReturnType<typeof setTimeout> | undefined;
  let currentEffect: AudioLike | undefined;
  let previousAssetId: string | undefined;

  const savePreferences = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Playback must survive unavailable or full storage.
    }
  };

  const updateVolumes = () => {
    music.muted = preferences.muted;
    music.volume = clamp(preferences.musicVolume * (voiceDepth > 0 ? MUSIC_DUCK_GAIN : 1));
    if (currentEffect) {
      currentEffect.muted = preferences.muted;
      currentEffect.volume = clamp(preferences.ambienceVolume * (voiceDepth > 0 ? AMBIENCE_DUCK_GAIN : 1));
    }
  };

  const chooseAsset = (): AmbienceAsset => {
    const candidates = AMBIENCE_ASSETS.length > 1
      ? AMBIENCE_ASSETS.filter((asset) => asset.id !== previousAssetId)
      : AMBIENCE_ASSETS;
    const totalWeight = candidates.reduce((sum, asset) => sum + asset.weight, 0);
    let target = random() * totalWeight;
    for (const asset of candidates) {
      target -= asset.weight;
      if (target < 0) return asset;
    }
    return candidates[candidates.length - 1];
  };

  const scheduleNext = () => {
    if (!started) return;
    const randomSeconds = 1 + Math.floor(random() * AMBIENCE_RANDOM_SECONDS);
    const delay = AMBIENCE_BASE_DELAY_MS + randomSeconds * 1_000;
    ambienceTimer = setTimer(playAmbience, delay);
  };

  const finishEffect = () => {
    const effect = currentEffect;
    if (!effect) return;
    currentEffect = undefined;
    effect.onended = null;
    effect.pause();
    effect.currentTime = 0;
    if (cutoffTimer) clearTimer(cutoffTimer);
    cutoffTimer = undefined;
  };

  const playAmbience = () => {
    if (!started || currentEffect) return;
    const asset = chooseAsset();
    previousAssetId = asset.id;
    const effect = createAudio(asset.src);
    currentEffect = effect;
    effect.onended = finishEffect;
    updateVolumes();
    cutoffTimer = setTimer(finishEffect, asset.maxPlaybackMs);
    void effect.play().catch(finishEffect);
    scheduleNext();
  };

  const start = () => {
    const firstStart = !started;
    started = true;
    updateVolumes();
    void music.play().catch(() => undefined);
    if (firstStart) scheduleNext();
  };

  const stop = () => {
    started = false;
    if (ambienceTimer) clearTimer(ambienceTimer);
    ambienceTimer = undefined;
    if (currentEffect) finishEffect();
    music.pause();
    music.currentTime = 0;
  };

  const setMuted = (muted: boolean) => {
    preferences.muted = muted;
    updateVolumes();
    savePreferences();
  };

  const setMusicVolume = (volume: number) => {
    preferences.musicVolume = clamp(volume);
    updateVolumes();
    savePreferences();
  };

  const setAmbienceVolume = (volume: number) => {
    preferences.ambienceVolume = clamp(volume);
    updateVolumes();
    savePreferences();
  };

  const beginVoice = () => {
    voiceDepth += 1;
    updateVolumes();
  };

  const endVoice = () => {
    voiceDepth = Math.max(0, voiceDepth - 1);
    updateVolumes();
  };

  return {
    start,
    stop,
    setMuted,
    setMusicVolume,
    setAmbienceVolume,
    beginVoice,
    endVoice,
    getPreferences: (): Readonly<AudioPreferences> => ({ ...preferences }),
  };
}
