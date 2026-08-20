import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { entryCityBackdropMarkup } from "./entry-presentation";

describe("pre-runtime city presentation", () => {
  it("renders a substantial procedural skyline without distributable media", () => {
    const markup = entryCityBackdropMarkup();

    expect(markup).toContain('class="entrada-cidade"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup.match(/entrada-predio/g)?.length).toBeGreaterThanOrEqual(8);
    expect(markup).toContain("entrada-arvore");
    expect(markup).not.toMatch(/<img|url\(|\/assets\/|\.png|\.webp/i);
  });

  it("keeps the entry presentation independent from Three.js", () => {
    const markup = entryCityBackdropMarkup();

    expect(markup).not.toContain("three");
    expect(markup).not.toContain("canvas");
  });

  it("exposes explicit native sound controls without generic playback triggers", () => {
    const root = process.cwd();
    const entrySource = readFileSync(resolve(root, "src/game/entrada.ts"), "utf8");
    const pageSource = readFileSync(resolve(root, "app/page.tsx"), "utf8");

    expect(entrySource).toContain('data-audio-command="toggle_mute"');
    expect(entrySource).toContain('data-audio-command="volume_down"');
    expect(entrySource).toContain('data-audio-command="volume_up"');
    expect(entrySource).toContain("<output data-audio-level");
    expect(pageSource).not.toContain("addEventListener('pointerdown', startAudio");
    expect(pageSource).not.toContain("addEventListener('keydown', startAudio");
  });
});
