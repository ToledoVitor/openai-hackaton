# Cozy City generated audio

`Cozy City Loop` and all five ambience effects are original deterministic
syntheses created by this repository. They use only oscillators, envelopes,
filters, and seeded noise: no external samples, downloads, or recordings enter
the generation pipeline.

Generate the exports with `npm run audio:generate` and verify them with
`npm run audio:verify`. The checked-in generation seed is `20260819`.

Animal Crossing is a thematic boundary reference only for broad qualities such
as cozy daily life, friendliness, restraint, and light instrumentation. No
melody, harmony sequence, arrangement, sound effect, recording, or instrument
sample from Animal Crossing or any other work was transcribed, interpolated,
quoted, copied, or closely imitated.

The development-only Ogg encoder is `@audio/encode-ogg@1.2.2`, licensed MIT.
Runtime deployment ships the generated media files—not the encoder or its WASM
toolchain. Generator code is MIT licensed under the repository root `LICENSE`.
The generated WAV and Ogg media are released under CC0 1.0; see `LICENSE` here.

The manifest inventory table below is an auditable snapshot. The generator does
not overwrite this README, so later human audit notes remain stable across
regeneration.

| Asset | Duration | Bytes | SHA-256 |
|---|---:|---:|---|
| `music/cozy-city-loop.ogg` | 48.0 s | 274615 | `a258ccc4ed3388b1bff8538b156305b8868171e5ac6ac3f4da823abaebdd98a2` |
| `music/cozy-city-loop.wav` | 48.0 s | 8467244 | `482a55dee6fad60bcb9107a1529462ef9c165eb5b49cf4bb174cacc53f3522da` |
| `sfx/bicycle-bell.ogg` | 1.6 s | 11496 | `dec1d1c438aa9e84bc8522a5efc31e0e575031f671e2608d88803cd49e5e1ff6` |
| `sfx/birds.ogg` | 2.4 s | 8558 | `8b0d9943866470c1a6e6dd69f648c45a31822fa04117f58cb5f02ec0c0562d45` |
| `sfx/crosswalk-chirp.ogg` | 1.8 s | 6845 | `af9d296abcfc5dec15cf4ee379449c3e3ef5d242450d592d90d739a6d3084606` |
| `sfx/distant-bus.ogg` | 4.8 s | 61662 | `93729b708d8f1f60d025db3cad1c762547ab4bfe020f0db856776e812d05cc0e` |
| `sfx/footsteps.ogg` | 2.8 s | 19186 | `0cbd6192fe20b3e58c49daf35b05115053ecab79871e58138b7ff33972187593` |
