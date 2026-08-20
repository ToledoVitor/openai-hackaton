import { uiText } from "../client/ui-copy";
import type { Language } from "../domain/mission-contracts";
import type { AudioPreferences } from "./audioManager";

export const AUDIO_PREFERENCES_CHANGE_EVENT = "ai-city:audio-preferences-change";
export const ENTRY_VOLUME_STEP = 0.1;

export type EntryAudioCommand = "toggle_mute" | "volume_down" | "volume_up";

export type EntryAudioPort = {
  start(): void;
  getPreferences(): Readonly<AudioPreferences>;
  setMuted(muted: boolean): void;
  setMusicVolume(volume: number): void;
  setAmbienceVolume(volume: number): void;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const roundVolume = (value: number) => Math.round(clamp(value) * 100) / 100;

export function applyEntryAudioCommand(audio: EntryAudioPort, command: EntryAudioCommand): AudioPreferences {
  const current = audio.getPreferences();

  if (command === "toggle_mute") {
    const muted = !current.muted;
    audio.setMuted(muted);
    if (!muted) audio.start();
    return { ...audio.getPreferences() };
  }

  const delta = command === "volume_up" ? ENTRY_VOLUME_STEP : -ENTRY_VOLUME_STEP;
  audio.setMusicVolume(roundVolume(current.musicVolume + delta));
  audio.setAmbienceVolume(roundVolume(current.ambienceVolume + delta));
  if (!current.muted) audio.start();
  return { ...audio.getPreferences() };
}

export function entryAudioView(language: Language, preferences: Readonly<AudioPreferences>) {
  const levelText = `${Math.round(((preferences.musicVolume + preferences.ambienceVolume) / 2) * 100)}%`;
  return {
    groupLabel: uiText(language, "entry_audio_label"),
    muteLabel: uiText(language, preferences.muted ? "entry_unmute" : "entry_mute"),
    volumeDownLabel: uiText(language, "volume_down"),
    volumeUpLabel: uiText(language, "volume_up"),
    levelLabel: uiText(language, "volume_level").replace("{level}", levelText),
    levelText,
  };
}
