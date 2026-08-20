# Asset attribution and release audit

Apache-2.0 covers project source/documentation only. Media retains separate terms.

| Asset group | Local paths | Evidence | Status |
|---|---|---|---|
| KayKit City Builder Bits 1.0 | `public/assets/3d/cidade/` city props, buildings, roads, vehicles, texture and matching `.bin` files | `LICENSE-kaykit-city-builder.txt`; creator Kay Lousberg; CC0 1.0 | Cleared under CC0 |
| Quaternius Ultimate Modular Males | `prefeito.gltf`, `operario.gltf` | `LICENSE-quaternius-men.txt`; Quaternius; CC0 1.0 | Cleared under CC0 |
| OpenGameArt audio | `public/audio/music/`, `public/audio/sfx/` | Per-file creator, source URL, hash in `public/audio/SOURCES.md`; CC0 in `public/audio/LICENSE.md` | Cleared under CC0 |
| AI City logo | `public/assets/brand/ai-city-logo.png` | Added in commit `c16f78d`; no source URL, author declaration, generation record, or license; PNG metadata gives no provenance | **Unresolved release blocker** |

Do not claim logo is Google-generated, project-owned, or distributable: repository contains no evidence for any such claim. Before public source/package release, obtain written license/source record or exclude and replace logo with provenance-cleared artwork. Runtime reference remains for current task; unresolved status does not become permission.

No other image/sprite asset exists under `public/assets` at audit time. Future media PRs must add creator, original URL, license identifier/text, modification notes, and checksum before merge.
