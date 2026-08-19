import { measureAudio } from "./analysis";
import { SAMPLE_RATE } from "./constants";

export type StereoPcm = {
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
};

export type ToneOptions = {
  start: number;
  duration: number;
  frequency: number;
  gain: number;
  pan: number;
  attack?: number;
  release?: number;
  partials?: ReadonlyArray<{ ratio: number; gain: number }>;
};

export type NoiseBurstOptions = Omit<ToneOptions, "frequency" | "partials"> & {
  cutoff?: number;
};

const DEFAULT_ATTACK = 0.005;
const DEFAULT_RELEASE = 0.02;

export function createPcm(seconds: number, sampleRate = SAMPLE_RATE): StereoPcm {
  const frames = Math.max(0, Math.round(seconds * sampleRate));
  return {
    sampleRate,
    left: new Float32Array(frames),
    right: new Float32Array(frames),
  };
}

export function mixTone(pcm: StereoPcm, options: ToneOptions): void {
  const startFrame = Math.max(0, Math.round(options.start * pcm.sampleRate));
  const frameCount = Math.max(0, Math.round(options.duration * pcm.sampleRate));
  const endFrame = Math.min(pcm.left.length, startFrame + frameCount);
  const { leftGain, rightGain } = panGains(options.pan);
  const partials = options.partials ?? [{ ratio: 1, gain: 1 }];

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const position = frame - startFrame;
    const time = frame / pcm.sampleRate;
    let sample = 0;
    for (const partial of partials) {
      sample += Math.sin(2 * Math.PI * options.frequency * partial.ratio * time) * partial.gain;
    }
    sample *= options.gain * envelope(position, frameCount, pcm.sampleRate, options.attack, options.release);
    pcm.left[frame] += sample * leftGain;
    pcm.right[frame] += sample * rightGain;
  }
}

export function mixNoiseBurst(pcm: StereoPcm, options: NoiseBurstOptions, random: () => number): void {
  const frameCount = Math.max(0, Math.round(options.duration * pcm.sampleRate));
  const burst = createPcm(frameCount / pcm.sampleRate, pcm.sampleRate);
  const { leftGain, rightGain } = panGains(options.pan);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const sample =
      (random() * 2 - 1) * options.gain * envelope(frame, frameCount, pcm.sampleRate, options.attack, options.release);
    burst.left[frame] = sample * leftGain;
    burst.right[frame] = sample * rightGain;
  }
  applyOnePoleLowPass(burst, options.cutoff ?? 2_000);

  const startFrame = Math.max(0, Math.round(options.start * pcm.sampleRate));
  const framesToMix = Math.min(frameCount, pcm.left.length - startFrame);
  for (let frame = 0; frame < Math.max(0, framesToMix); frame += 1) {
    pcm.left[startFrame + frame] += burst.left[frame];
    pcm.right[startFrame + frame] += burst.right[frame];
  }
}

export function applyOnePoleLowPass(pcm: StereoPcm, cutoff: number): void {
  const boundedCutoff = Math.max(0, Math.min(cutoff, pcm.sampleRate / 2));
  const coefficient = Math.exp((-2 * Math.PI * boundedCutoff) / pcm.sampleRate);
  let previousLeft = 0;
  let previousRight = 0;

  for (let frame = 0; frame < pcm.left.length; frame += 1) {
    previousLeft = (1 - coefficient) * pcm.left[frame] + coefficient * previousLeft;
    previousRight = (1 - coefficient) * pcm.right[frame] + coefficient * previousRight;
    pcm.left[frame] = previousLeft;
    pcm.right[frame] = previousRight;
  }
}

export function normalizeToPeak(pcm: StereoPcm, peak: number): void {
  const currentPeak = measureAudio(pcm).peak;
  if (currentPeak > 0) scalePcm(pcm, peak / currentPeak);
}

export function masterToTargetRms(pcm: StereoPcm, targetRmsDbfs: number, ceiling: number): void {
  const targetRms = 10 ** (targetRmsDbfs / 20);
  const initialMetrics = measureAudio(pcm);
  if (initialMetrics.rms === 0) return;

  scalePcm(pcm, targetRms / initialMetrics.rms);
  const masteredMetrics = measureAudio(pcm);
  if (masteredMetrics.truePeak > ceiling && masteredMetrics.truePeak > 0) {
    scalePcm(pcm, ceiling / masteredMetrics.truePeak);
  }
}

function envelope(
  frame: number,
  frameCount: number,
  sampleRate: number,
  attack = DEFAULT_ATTACK,
  release = DEFAULT_RELEASE,
): number {
  const attackFrames = Math.min(Math.round(attack * sampleRate), Math.floor(frameCount / 2));
  const releaseFrames = Math.min(Math.round(release * sampleRate), Math.floor(frameCount / 2));
  if (attackFrames > 0 && frame < attackFrames) return cosineRamp(frame / attackFrames);
  if (releaseFrames > 0 && frame >= frameCount - releaseFrames) {
    return cosineRamp((frameCount - 1 - frame) / releaseFrames);
  }
  return 1;
}

function cosineRamp(progress: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, progress)));
}

function panGains(pan: number): { leftGain: number; rightGain: number } {
  const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return { leftGain: Math.cos(angle), rightGain: Math.sin(angle) };
}

function scalePcm(pcm: StereoPcm, gain: number): void {
  for (let frame = 0; frame < pcm.left.length; frame += 1) {
    pcm.left[frame] *= gain;
    pcm.right[frame] *= gain;
  }
}
