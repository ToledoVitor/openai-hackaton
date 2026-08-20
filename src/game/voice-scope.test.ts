import { describe, expect, it, vi } from "vitest";

import { createVoiceScope, stopVoiceInteraction } from "./voice-scope";

describe("voice mission scope", () => {
  it("disconnects and invalidates pending voice when mission changes or text is chosen", () => {
    const scope = createVoiceScope();
    const token = scope.begin("hospital_construction");
    const voice = { disconnect: vi.fn() };
    scope.attach(token, voice);

    expect(scope.isCurrent(token, "hospital_construction")).toBe(true);
    scope.stop();

    expect(voice.disconnect).toHaveBeenCalledWith(false);
    expect(scope.isCurrent(token, "hospital_construction")).toBe(false);
  });

  it("returns reset UI state and ends audio when game resets", () => {
    const scope = createVoiceScope();
    const voice = { disconnect: vi.fn() };
    const audio = { endVoice: vi.fn() };
    scope.attach(scope.begin("urban_repair"), voice);

    expect(stopVoiceInteraction(scope, audio)).toBe("ready");
    expect(voice.disconnect).toHaveBeenCalledWith(false);
    expect(audio.endVoice).toHaveBeenCalledOnce();
  });
});
