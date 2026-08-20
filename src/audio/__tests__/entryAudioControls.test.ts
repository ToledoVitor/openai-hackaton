import { describe, expect, it, vi } from "vitest";

import type { AudioPreferences } from "../audioManager";
import {
  applyEntryAudioCommand,
  entryAudioView,
  type EntryAudioPort,
} from "../entryAudioControls";

function fakeAudio(initial: AudioPreferences): EntryAudioPort {
  const preferences = { ...initial };
  return {
    start: vi.fn<() => void>(),
    getPreferences: () => ({ ...preferences }),
    setMuted: (muted) => { preferences.muted = muted; },
    setMusicVolume: (volume) => { preferences.musicVolume = volume; },
    setAmbienceVolume: (volume) => { preferences.ambienceVolume = volume; },
  };
}

describe("pre-entry audio controls", () => {
  it("persists compact volume changes across both existing channels", () => {
    const audio = fakeAudio({ muted: false, musicVolume: 0.18, ambienceVolume: 0.25 });

    const next = applyEntryAudioCommand(audio, "volume_up");

    expect(next).toEqual({ muted: false, musicVolume: 0.28, ambienceVolume: 0.35 });
    expect(audio.getPreferences()).toEqual(next);
    expect(audio.start).toHaveBeenCalledOnce();
  });

  it("clamps volume and never starts playback while muted", () => {
    const audio = fakeAudio({ muted: true, musicVolume: 0.04, ambienceVolume: 0.02 });

    const next = applyEntryAudioCommand(audio, "volume_down");

    expect(next).toEqual({ muted: true, musicVolume: 0, ambienceVolume: 0 });
    expect(audio.start).not.toHaveBeenCalled();
  });

  it("starts only when explicit mute control turns sound back on", () => {
    const audio = fakeAudio({ muted: true, musicVolume: 0.18, ambienceVolume: 0.25 });

    expect(entryAudioView("english", audio.getPreferences()).muteLabel).toBe("Turn on sound");
    expect(audio.start).not.toHaveBeenCalled();

    const next = applyEntryAudioCommand(audio, "toggle_mute");

    expect(next.muted).toBe(false);
    expect(audio.start).toHaveBeenCalledOnce();
  });

  it("provides bilingual accessible labels and a human-readable level", () => {
    const preferences = { muted: false, musicVolume: 0.2, ambienceVolume: 0.4 };

    expect(entryAudioView("portuguese", preferences)).toEqual({
      groupLabel: "Controles de som",
      muteLabel: "Silenciar som",
      volumeDownLabel: "Diminuir volume",
      volumeUpLabel: "Aumentar volume",
      levelLabel: "Nível do som: 30%",
      levelText: "30%",
    });
    expect(entryAudioView("english", preferences).groupLabel).toBe("Sound controls");
  });
});
