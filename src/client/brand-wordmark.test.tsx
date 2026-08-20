import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BrandWordmark, brandWordmarkMarkup } from "./brand-wordmark";

describe("provenance-safe AI City wordmark", () => {
  it("renders accessible header branding without image media", () => {
    const markup = renderToStaticMarkup(<BrandWordmark variant="header" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="AI City"');
    expect(markup).toContain('class="brand-wordmark brand-wordmark--header"');
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("/assets/");
  });

  it("provides matching static markup for pre-runtime entry screens", () => {
    const markup = brandWordmarkMarkup("hero");

    expect(markup).toContain('aria-label="AI City"');
    expect(markup).toContain('brand-wordmark--hero');
    expect(markup).toContain('aria-hidden="true">AI</span>');
    expect(markup).toContain('aria-hidden="true">City</span>');
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain(".png");
  });

  it("excludes the unlicensed legacy logo from distributable runtime sources", () => {
    const root = process.cwd();
    const legacyLogo = resolve(root, "public/assets/brand/ai-city-logo.png");
    const runtimeSources = ["app/page.tsx", "app/globals.css", "src/game/entrada.ts"]
      .map((path) => readFileSync(resolve(root, path), "utf8"))
      .join("\n");

    expect(existsSync(legacyLogo)).toBe(false);
    expect(runtimeSources).not.toContain("ai-city-logo");
    expect(runtimeSources).not.toContain("/assets/brand/");
  });
});
