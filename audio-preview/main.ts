import { createAudioManager } from "../src/audio";

const manager = createAudioManager();
const start = document.querySelector<HTMLButtonElement>("#start")!;
const mute = document.querySelector<HTMLButtonElement>("#mute")!;
const music = document.querySelector<HTMLInputElement>("#music")!;
const ambience = document.querySelector<HTMLInputElement>("#ambience")!;

let muted = manager.getPreferences().muted;
music.value = String(manager.getPreferences().musicVolume);
ambience.value = String(manager.getPreferences().ambienceVolume);

start.addEventListener("click", () => {
  manager.start();
  start.textContent = "Audio running";
  start.disabled = true;
});

mute.addEventListener("click", () => {
  muted = !muted;
  manager.setMuted(muted);
  mute.textContent = muted ? "Unmute" : "Mute";
});

music.addEventListener("input", () => manager.setMusicVolume(music.valueAsNumber));
ambience.addEventListener("input", () => manager.setAmbienceVolume(ambience.valueAsNumber));

window.addEventListener("pagehide", manager.stop);
