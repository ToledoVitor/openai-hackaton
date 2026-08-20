# Asset attribution and release audit

Apache-2.0 covers project source/documentation only. Media retains separate terms.

| Asset group | Local paths | Evidence | Status |
|---|---|---|---|
| KayKit City Builder Bits 1.0 | `public/assets/3d/cidade/` city props, buildings, roads, vehicles, texture and matching `.bin` files | `LICENSE-kaykit-city-builder.txt`; creator Kay Lousberg; CC0 1.0 | Cleared under CC0 |
| Quaternius Ultimate Modular Males | `prefeito.gltf`, `operario.gltf` | `LICENSE-quaternius-men.txt`; Quaternius; CC0 1.0 | Cleared under CC0 |
| OpenGameArt audio | `public/audio/music/`, `public/audio/sfx/` | Per-file creator, source URL, hash in `public/audio/SOURCES.md`; CC0 in `public/audio/LICENSE.md` | Cleared under CC0 |
| Legacy AI City logo | Not present in current tree/current-tag source archive; former path `public/assets/brand/ai-city-logo.png` | Historical file had no source URL, author declaration, generation record, or license | Excluded from release; no rights asserted |

Visual-polish phase reuses KayKit `bench.gltf`, `bush.gltf`, and `streetlight.gltf` through clones. Bus shelters and grass tufts are project-authored runtime geometry/material instances and add no media file or third-party dependency. No external asset was downloaded or generated.

Current header and entry branding is HTML/CSS source code under project license, not media. Legacy logo PNG was deleted from current tree and every runtime reference was removed. Historical Git revisions predate exclusion and are not current release artifacts. Repository makes no origin, ownership, generation, or distribution-rights claim about excluded file.

No other image/sprite asset exists under `public/assets` at audit time. Future media PRs must add creator, original URL, license identifier/text, modification notes, and checksum before merge.
