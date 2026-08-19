import type { StereoPcm } from "./dsp";

export type AudioMetrics = {
  duration: number;
  peak: number;
  truePeak: number;
  rms: number;
  nonSilentSamples: number;
  boundaryJump: number;
};

const SILENCE_THRESHOLD = 1e-6;

export function measureAudio(pcm: StereoPcm): AudioMetrics {
  const { left, right } = pcm;
  let peak = 0;
  let truePeak = 0;
  let squareSum = 0;
  let nonSilentSamples = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftSample = left[index];
    const rightSample = right[index];
    const leftMagnitude = Math.abs(leftSample);
    const rightMagnitude = Math.abs(rightSample);

    peak = Math.max(peak, leftMagnitude, rightMagnitude);
    squareSum += leftSample ** 2 + rightSample ** 2;
    nonSilentSamples += Number(leftMagnitude > SILENCE_THRESHOLD) + Number(rightMagnitude > SILENCE_THRESHOLD);

    const nextIndex = Math.min(index + 1, left.length - 1);
    for (let step = 0; step < 4; step += 1) {
      const fraction = step / 4;
      const interpolatedLeft = leftSample + (left[nextIndex] - leftSample) * fraction;
      const interpolatedRight = rightSample + (right[nextIndex] - rightSample) * fraction;
      truePeak = Math.max(truePeak, Math.abs(interpolatedLeft), Math.abs(interpolatedRight));
    }
  }

  const frameCount = left.length;
  return {
    duration: frameCount / pcm.sampleRate,
    peak,
    truePeak,
    rms: frameCount === 0 ? 0 : Math.sqrt(squareSum / (frameCount * 2)),
    nonSilentSamples,
    boundaryJump:
      frameCount === 0
        ? 0
        : Math.max(Math.abs(left[0] - left[frameCount - 1]), Math.abs(right[0] - right[frameCount - 1])),
  };
}
