# AI City Mayor — Cozy City Audio Design

**Status:** Approved design; pending implementation plan

**Date:** 2026-08-19

**Constraint:** Original, reproducible, open-source code and CC0 audio only

## Purpose

Give Soft Toy City a friendly urban identity without distracting from Prompt Quest reading, generated citizen speech, or three-minute judge demo. Music should evoke broad cozy-life-game qualities—warmth, small-scale routine, and gentle playfulness—while remaining an original composition with no copied melody, arrangement, recording, sample, or game asset.

## Deliverables

1. One original, seamless 48-second daytime City music loop.
2. Lossless WAV master and compressed Ogg Vorbis runtime export.
3. Five original synthesized ambience effects: generic crosswalk chirp, bicycle bell, distant bus, footsteps, and birds.
4. Deterministic source generator that can reproduce every audio asset without external samples.
5. Browser Audio Director for playback, ambience scheduling, voice ducking, preferences, and lifecycle handling.
6. Provenance, generation instructions, checksums, and CC0 licensing for exported audio.

## Copyright and Licensing Boundary

- Animal Crossing is a thematic reference only: cozy daily life, friendliness, restraint, and light instrumentation.
- Do not transcribe, interpolate, quote, or closely imitate any recognizable melody, harmony sequence, arrangement, sound effect, recording, or instrument sample from Animal Crossing or another work.
- Generate all musical voices and ambience from oscillators, envelopes, filters, and deterministic noise. Do not download, record, or bundle third-party samples.
- Make generic city signals rather than reproducing a branded, location-specific, or recorded crosswalk sound.
- Release generated WAV and Ogg files under CC0 1.0 with a dedicated `public/audio/LICENSE` file.
- Release generator and runtime code under MIT through repository root `LICENSE`. If repository receives another approved open-source code license before implementation, use that license instead and document the choice.
- Record generator version, command, seed, asset inventory, and SHA-256 checksums in `public/audio/README.md`.

## Composition

### Musical shape

- Duration: exactly 48 seconds.
- Tempo: 90 BPM, yielding exactly 18 bars in 48 seconds.
- Meter: 4/4.
- Tonal character: warm major harmony with restrained sixth and seventh colors.
- Motif: original four-note marimba phrase, varied through register, rhythm, and accompaniment.
- Form: three-bar introduction (8 seconds), two six-bar gentle variations (16 seconds each), then a three-bar return (8 seconds) that meets the opening without a click or harmonic jolt.
- Density: no dominant lead voice; leave room for reading, game feedback, and speech.

### Synthesized palette

- Marimba-like voice: sine/triangle partials with short pitched decay.
- Soft electric-piano voice: layered sine partials, mellow transient, slow release.
- Rounded bass: filtered triangle/sine voice with minimal upper harmonics.
- Brushed percussion: filtered deterministic noise with quiet pulse and sparse accents.
- Bell accent: short inharmonic sine partials used sparingly.

### Mastering targets

- Integrated loudness target: approximately -18 LUFS.
- True peak ceiling: -1 dBFS.
- Stereo width remains modest so mono playback stays coherent.
- Loop boundary receives sample-level continuity and listening checks.
- Music runtime volume defaults to 35%, separate from mastered file level.

## Ambience Assets

Each effect is synthesized from code and exported separately.

| Effect | Construction | Relative frequency | Spatial behavior |
|---|---|---:|---|
| Birds | Original short pitched chirps with envelopes and subtle variation | Common | Gently wide |
| Footsteps | Filtered noise impacts with alternating tone and timing | Common | Alternates left/right |
| Bicycle bell | Two decaying inharmonic partial clusters | Medium | Random mild left/right position |
| Crosswalk chirp | Generic short tonal pulses; no recorded or regional signature copy | Medium | Near center |
| Distant bus | Low filtered noise, soft motor partial, slow pass envelope | Rare | Distant and narrow |

Ambience plays 8–14 dB below music. Effects must remain recognizable at laptop-speaker volume without competing with voice.

## Asset Generation Pipeline

`scripts/audio/generate-audio.ts` owns deterministic synthesis and PCM rendering. A fixed checked-in seed produces identical masters. FFmpeg converts WAV masters to Ogg Vorbis runtime files; no FFmpeg library or binary ships to browser.

Expected outputs:

```text
public/audio/
├── LICENSE
├── README.md
├── music/
│   ├── cozy-city-loop.wav
│   └── cozy-city-loop.ogg
└── sfx/
    ├── birds.ogg
    ├── bicycle-bell.ogg
    ├── crosswalk-chirp.ogg
    ├── distant-bus.ogg
    └── footsteps.ogg
```

Generation must fail on clipping, incorrect music duration, missing outputs, or unexpected nondeterministic hashes. Runtime files remain checked in so deployment does not require audio tooling.

## Runtime Architecture

### Audio Director

`src/audio/AudioDirector.ts` exposes a small interface to application UI and voice playback:

```ts
type AudioPreferences = {
  muted: boolean;
  musicVolume: number;
  ambienceVolume: number;
};

type AudioDirector = {
  unlock(): Promise<void>;
  startMusic(): Promise<void>;
  stopMusic(): void;
  setPreferences(next: AudioPreferences): void;
  beginVoice(): void;
  endVoice(): void;
  dispose(): void;
};
```

UI does not schedule individual sounds. Audio Director owns decoded buffers, music looping, ambience choice, gain changes, page visibility, and cleanup. Voice player calls `beginVoice` and `endVoice`; it does not change music gain directly.

### Playback flow

1. First meaningful player click or tap calls `unlock`; no autoplay workaround is attempted.
2. Audio Director creates or resumes one `AudioContext`, loads buffers, and starts music.
3. Music loops through a decoded buffer for stable timing.
4. Scheduler waits a random 8–22 seconds, then selects one weighted ambience effect.
5. Scheduler never selects same effect twice consecutively and never starts a new effect while another ambience effect is active.
6. Beginning citizen speech lowers music by approximately 8 dB and ambience by approximately 10 dB with a short ramp.
7. Ending speech restores prior levels with a gentle ramp.
8. Hidden document pauses ambience scheduling. Returning document resumes with a newly selected delay rather than playing queued effects.

Normal play uses browser randomness. Automated tests and guided demo mode inject a seeded random source for repeatable behavior.

## Controls and Persistence

- Always show master mute control after audio becomes available.
- Provide separate music and ambience levels in lightweight settings.
- Defaults: music 35%, ambience 25%, generated voice 100%.
- Persist only mute and volume preferences in localStorage.
- Do not persist decoded audio, generated voice, raw microphone audio, or playback history.
- Reduced-motion preference does not mute audio automatically; explicit audio controls remain authoritative.

## Failure Behavior

- Failure to create or resume `AudioContext`: continue game silently.
- Missing or undecodable music: keep ambience and voice available.
- Missing individual SFX: exclude failed asset from selection pool.
- Empty ambience pool: stop scheduling without retries or player-facing modal.
- Voice playback failure: restore ducked gains through `endVoice` in guaranteed cleanup.
- Route changes, reset, or component unmount: cancel timers, stop owned sources, disconnect nodes, and release references.
- Audio never blocks Prompt Quest state or repair animation.

## Verification

### Automated checks

- Generator returns identical hashes for fixed source, seed, and toolchain.
- Music master duration is exactly 48 seconds.
- Samples stay within peak limit and contain no unintended silence or clipping.
- Start/end boundary stays below defined discontinuity threshold.
- Every documented output exists and matches provenance manifest.
- Scheduler delay remains within 8–22 seconds.
- Weighted selection never immediately repeats and respects single-active-effect rule.
- Seeded scheduler produces stable sequence.
- Mute and level changes reach correct gain nodes and persist.
- Voice ducking restores prior levels after success, failure, interruption, and repeated calls.
- Visibility changes cancel queued ambience and resume with fresh delay.
- Asset-load failures degrade independently.

### Manual checks

- Listen across loop boundary on headphones and laptop speakers for click, rhythmic hitch, or obvious restart.
- Confirm music supports reading and does not mask generated citizen speech.
- Confirm each SFX reads as distant urban ambience rather than foreground action.
- Confirm mute responds immediately.
- Run two complete three-minute demos and one five-to-eight-minute session without ambience fatigue or clustered playback.
- Inspect generated audio with repository clean of unlicensed third-party inputs.

## Integration Scope

Implementation touches only audio generation, checked-in assets, Audio Director, minimal controls, voice-player ducking hooks, and tests. It does not add dynamic music states, time-of-day mixes, location-aware spatial audio, imported recordings, adaptive composition, or new visual effects.

## Kill Order

If four-hour prototype cap becomes threatened:

1. Keep music loop, mute, and CC0 provenance.
2. Keep voice ducking.
3. Keep birds, bicycle bell, and distant bus; cut crosswalk and footsteps if needed.
4. Cut separate ambience slider before cutting master mute.
5. Cut stereo motion before cutting deterministic scheduling tests.

## Acceptance Criteria

- Player can unlock, hear, mute, and adjust original cozy City music.
- Music loops for at least ten minutes without audible gap or accumulating timing drift.
- Five generated ambience categories play sparsely under normal conditions without immediate repetition or overlap.
- Citizen voice stays intelligible while music and ambience duck, then recover.
- Game remains fully playable when every audio asset fails.
- All audio can be regenerated from repository source without external samples.
- Exported assets carry CC0 declaration and reproducible provenance.
- Repository contains no copied melody, third-party sample, or asset with unclear rights.
