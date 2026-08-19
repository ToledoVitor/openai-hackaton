import { GENERATION_SEED, MASTER_PEAK } from "./constants";
import { createPcm, mixNoiseBurst, mixTone, normalizeToPeak, type StereoPcm } from "./dsp";
import { createRandom } from "./random";

export type AmbienceName = "birds" | "footsteps" | "bicycle-bell" | "crosswalk-chirp" | "distant-bus";

const DURATIONS: Record<AmbienceName, number> = {
  birds: 2.4,
  footsteps: 2.8,
  "bicycle-bell": 1.6,
  "crosswalk-chirp": 1.8,
  "distant-bus": 4.8,
};

const AMBIENCE_PEAK = MASTER_PEAK * 0.55;

function panGains(pan: number): { left: number; right: number } {
  const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return { left: Math.cos(angle), right: Math.sin(angle) };
}

function sineEnvelope(frame: number, frameCount: number): number {
  return Math.sin((Math.PI * frame) / Math.max(1, frameCount - 1));
}

function mixChirp(
  pcm: StereoPcm,
  start: number,
  duration: number,
  startFrequency: number,
  endFrequency: number,
  gain: number,
  pan: number,
): void {
  const startFrame = Math.round(start * pcm.sampleRate);
  const frameCount = Math.round(duration * pcm.sampleRate);
  const endFrame = Math.min(pcm.left.length, startFrame + frameCount);
  const stereo = panGains(pan);
  let phase = 0;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const offset = frame - startFrame;
    const progress = offset / Math.max(1, frameCount - 1);
    const contour = progress + 0.08 * Math.sin(progress * Math.PI * 2);
    const frequency = startFrequency + (endFrequency - startFrequency) * contour;
    phase += (2 * Math.PI * frequency) / pcm.sampleRate;
    const sample = Math.sin(phase) * sineEnvelope(offset, frameCount) * gain;
    pcm.left[frame] += sample * stereo.left;
    pcm.right[frame] += sample * stereo.right;
  }
}

function mixDecayingCluster(
  pcm: StereoPcm,
  start: number,
  baseFrequency: number,
  gain: number,
  pan: number,
): void {
  const startFrame = Math.round(start * pcm.sampleRate);
  const frameCount = Math.round(0.72 * pcm.sampleRate);
  const endFrame = Math.min(pcm.left.length, startFrame + frameCount);
  const stereo = panGains(pan);
  const ratios = [1, 2.13, 3.91] as const;
  const partialGains = [1, 0.42, 0.21] as const;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const offset = frame - startFrame;
    const elapsed = offset / pcm.sampleRate;
    const attack = Math.min(1, offset / Math.max(1, Math.round(0.004 * pcm.sampleRate)));
    const decay = Math.exp(-5.5 * elapsed);
    let sample = 0;
    for (let partial = 0; partial < ratios.length; partial += 1) {
      sample += Math.sin(2 * Math.PI * baseFrequency * ratios[partial] * elapsed) * partialGains[partial];
    }
    sample *= attack * decay * gain;
    pcm.left[frame] += sample * stereo.left;
    pcm.right[frame] += sample * stereo.right;
  }
}

function renderBirds(): StereoPcm {
  const pcm = createPcm(DURATIONS.birds);
  mixChirp(pcm, 0.16, 0.3, 1_700, 2_750, 0.18, -0.45);
  mixChirp(pcm, 0.78, 0.27, 2_150, 3_100, 0.16, 0.35);
  mixChirp(pcm, 1.42, 0.34, 1_850, 2_900, 0.17, 0.6);
  return pcm;
}

function renderFootsteps(random: () => number): StereoPcm {
  const pcm = createPcm(DURATIONS.footsteps);
  [0.18, 0.61, 1.07, 1.55, 2.06, 2.52].forEach((start, step) => {
    mixNoiseBurst(
      pcm,
      {
        start,
        duration: 0.16,
        gain: 0.62,
        pan: step % 2 === 0 ? -0.25 : 0.25,
        attack: 0.006,
        release: 0.13,
        cutoff: 420,
      },
      random,
    );
  });
  return pcm;
}

function renderBicycleBell(random: () => number): StereoPcm {
  const pcm = createPcm(DURATIONS["bicycle-bell"]);
  mixDecayingCluster(pcm, 0.12, 1_260, 0.25, random() * 0.7 - 0.35);
  mixDecayingCluster(pcm, 0.62, 1_310, 0.2, random() * 0.7 - 0.35);
  return pcm;
}

function renderCrosswalkChirp(): StereoPcm {
  const pcm = createPcm(DURATIONS["crosswalk-chirp"]);
  [0.14, 0.37, 0.66, 1.02, 1.43].forEach((start, pulse) => {
    mixTone(pcm, {
      start,
      duration: pulse % 2 === 0 ? 0.075 : 0.09,
      frequency: 1_150,
      gain: 0.3,
      pan: 0,
      attack: 0.008,
      release: 0.035,
    });
  });
  return pcm;
}

function renderDistantBus(random: () => number): StereoPcm {
  const pcm = createPcm(DURATIONS["distant-bus"]);
  const duration = DURATIONS["distant-bus"];
  mixNoiseBurst(
    pcm,
    { start: 0, duration, gain: 0.19, pan: 0, attack: 1.45, release: 1.45, cutoff: 360 },
    random,
  );
  mixTone(pcm, {
    start: 0,
    duration,
    frequency: 73,
    gain: 0.05,
    pan: 0,
    attack: 1.45,
    release: 1.45,
  });
  mixTone(pcm, {
    start: 0,
    duration,
    frequency: 109.5,
    gain: 0.028,
    pan: 0,
    attack: 1.45,
    release: 1.45,
  });
  return pcm;
}

export function renderAmbienceAssets(seed = GENERATION_SEED): Record<AmbienceName, StereoPcm> {
  const random = createRandom(seed);
  const assets: Record<AmbienceName, StereoPcm> = {
    birds: renderBirds(),
    footsteps: renderFootsteps(random),
    "bicycle-bell": renderBicycleBell(random),
    "crosswalk-chirp": renderCrosswalkChirp(),
    "distant-bus": renderDistantBus(random),
  };

  for (const pcm of Object.values(assets)) normalizeToPeak(pcm, AMBIENCE_PEAK);
  return assets;
}
