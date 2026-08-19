import {
  BEATS_PER_BAR,
  GENERATION_SEED,
  MASTER_PEAK,
  MUSIC_BARS,
  MUSIC_SECONDS,
  SECONDS_PER_BEAT,
  TARGET_RMS_DBFS,
} from "./constants";
import { createPcm, masterToTargetRms, mixNoiseBurst, mixTone, type StereoPcm } from "./dsp";
import { createRandom } from "./random";

const CHORDS = [
  [48, 52, 55, 57],
  [52, 55, 59, 62],
  [53, 57, 60, 64],
  [48, 52, 55, 57],
  [47, 50, 55, 59],
  [45, 48, 52, 55],
  [52, 55, 59, 62],
  [53, 57, 60, 64],
  [55, 59, 62, 64],
  [50, 53, 57, 60],
  [55, 59, 62, 65],
  [48, 52, 55, 59],
  [45, 49, 52, 55],
  [50, 53, 57, 60],
  [55, 59, 62, 64],
  [53, 57, 60, 64],
  [55, 59, 62, 64],
  [48, 52, 55, 57],
] as const;

const MOTIF = [64, 67, 69, 67] as const;
const BAR_SECONDS = BEATS_PER_BAR * SECONDS_PER_BEAT;
const EDGE_SECONDS = 0.04;

const ELECTRIC_PIANO_PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 2, gain: 0.18 },
  { ratio: 3, gain: 0.06 },
] as const;
const MARIMBA_PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 2, gain: 0.28 },
  { ratio: 3.9, gain: 0.12 },
] as const;
const BASS_PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 3, gain: -1 / 9 },
  { ratio: 5, gain: 1 / 25 },
] as const;
const BELL_PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 2.01, gain: 0.34 },
  { ratio: 3.97, gain: 0.16 },
] as const;

function midiFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function mixElectricPiano(pcm: StereoPcm, bar: number): void {
  const barStart = bar * BAR_SECONDS + (bar === 0 ? EDGE_SECONDS + 0.01 : 0);
  const duration = BAR_SECONDS - (bar === 0 ? EDGE_SECONDS + 0.01 : 0) - 0.08;
  CHORDS[bar].forEach((midi, voice) => {
    mixTone(pcm, {
      start: barStart,
      duration,
      frequency: midiFrequency(midi),
      gain: 0.055,
      pan: [-0.48, -0.16, 0.16, 0.48][voice],
      attack: 0.075,
      release: 0.34,
      partials: ELECTRIC_PIANO_PARTIALS,
    });
  });
}

function mixBass(pcm: StereoPcm, bar: number): void {
  if (bar < 2) return;
  mixTone(pcm, {
    start: bar * BAR_SECONDS,
    duration: BAR_SECONDS - 0.12,
    frequency: midiFrequency(CHORDS[bar][0] - 12),
    gain: bar >= 15 ? 0.055 : 0.07,
    pan: -0.04,
    attack: 0.035,
    release: 0.3,
    partials: BASS_PARTIALS,
  });
}

function mixMotif(pcm: StereoPcm, bar: number, gain: number, offsetBeats = 0.5): void {
  MOTIF.forEach((midi, note) => {
    mixTone(pcm, {
      start: bar * BAR_SECONDS + (offsetBeats + note * 0.75) * SECONDS_PER_BEAT,
      duration: 0.34,
      frequency: midiFrequency(midi),
      gain,
      pan: [-0.32, 0.22, 0.38, -0.12][note],
      attack: 0.006,
      release: 0.25,
      partials: MARIMBA_PARTIALS,
    });
  });
}

function mixBrushes(pcm: StereoPcm, bar: number, random: () => number): void {
  for (let beat = 0; beat < BEATS_PER_BAR; beat += 1) {
    mixNoiseBurst(
      pcm,
      {
        start: bar * BAR_SECONDS + (beat + 0.5) * SECONDS_PER_BEAT,
        duration: 0.12,
        gain: beat === 1 || beat === 3 ? 0.035 : 0.024,
        pan: beat % 2 === 0 ? -0.18 : 0.18,
        attack: 0.008,
        release: 0.09,
        cutoff: 2_400,
      },
      random,
    );
  }
}

function mixBell(pcm: StereoPcm, bar: number): void {
  mixTone(pcm, {
    start: bar * BAR_SECONDS + 3.25 * SECONDS_PER_BEAT,
    duration: 0.38,
    frequency: midiFrequency(76),
    gain: 0.032,
    pan: 0.34,
    attack: 0.004,
    release: 0.32,
    partials: BELL_PARTIALS,
  });
}

function applyEqualPowerEdgeCrossfade(pcm: StereoPcm): void {
  const crossfadeFrames = Math.round(EDGE_SECONDS * pcm.sampleRate);
  const tailStart = pcm.left.length - crossfadeFrames;
  for (let frame = 0; frame < crossfadeFrames; frame += 1) {
    const progress = frame / Math.max(1, crossfadeFrames - 1);
    const tailGain = Math.cos((progress * Math.PI) / 2);
    const headGain = Math.sin((progress * Math.PI) / 2);
    pcm.left[tailStart + frame] = pcm.left[tailStart + frame] * tailGain + pcm.left[frame] * headGain;
    pcm.right[tailStart + frame] = pcm.right[tailStart + frame] * tailGain + pcm.right[frame] * headGain;
  }
}

export function renderCozyCityLoop(seed = GENERATION_SEED): StereoPcm {
  const pcm = createPcm(MUSIC_SECONDS);
  const random = createRandom(seed);

  for (let bar = 0; bar < MUSIC_BARS; bar += 1) {
    mixElectricPiano(pcm, bar);
    mixBass(pcm, bar);

    if (bar >= 3 && bar < 15) mixBrushes(pcm, bar, random);
    if (bar === 1 || (bar >= 3 && bar < 9) || bar === 15 || bar === 16) mixMotif(pcm, bar, 0.075);
    if (bar >= 9 && bar < 15) {
      mixMotif(pcm, bar, 0.062, 0.25);
      if (bar % 2 === 0) mixBell(pcm, bar);
    }
  }

  applyEqualPowerEdgeCrossfade(pcm);
  masterToTargetRms(pcm, TARGET_RMS_DBFS, MASTER_PEAK);
  return pcm;
}
