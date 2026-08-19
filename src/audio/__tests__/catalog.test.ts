import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AMBIENCE_ASSETS, MUSIC_ASSET } from "../catalog";

type Manifest = {
  music: { id: string; path: string };
  ambience: Array<{ id: string; path: string }>;
};

describe("audio catalog", () => {
  it("stays synchronized with the licensed asset manifest", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../../public/audio/manifest.json", import.meta.url), "utf8"),
    ) as Manifest;

    expect(manifest.music).toMatchObject({ id: MUSIC_ASSET.id, path: MUSIC_ASSET.src });
    const byId = (left: { id: string }, right: { id: string }) => left.id.localeCompare(right.id);
    expect(AMBIENCE_ASSETS.map(({ id, src }) => ({ id, path: src })).sort(byId)).toEqual(
      manifest.ambience.map(({ id, path }) => ({ id, path })).sort(byId),
    );
  });
});
