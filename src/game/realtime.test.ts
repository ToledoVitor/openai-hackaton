import { describe, expect, it, vi } from "vitest";

import { RealtimeVoice } from "./realtime";

describe("Realtime voice consent boundary", () => {
  it("does not request an ephemeral credential when microphone permission is denied", async () => {
    const requestCredential = vi.fn();
    const states: string[] = [];
    const voice = new RealtimeVoice({
      getUserMedia: vi.fn(async () => { throw new DOMException("blocked", "NotAllowedError"); }),
      requestCredential,
    });

    await voice.connect("Mayor", {
      missionId: "hospital_construction",
      stepId: "prioritize",
      language: "english",
      attempt: 1,
      satisfiedCriteria: [],
      safetyIdentifier: "install_1234567890abcdef",
    }, {
      onState: (state) => states.push(state),
      onMayorText: vi.fn(),
      onPrompt: vi.fn(),
    });

    expect(requestCredential).not.toHaveBeenCalled();
    expect(states).toEqual(["connecting", "permission_denied"]);
  });

  it("cancels a pending microphone request before creating provider credentials", async () => {
    let resolveStream!: (stream: MediaStream) => void;
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track], getAudioTracks: () => [] } as unknown as MediaStream;
    const requestCredential = vi.fn();
    const voice = new RealtimeVoice({
      getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { resolveStream = resolve; })),
      requestCredential,
    });
    const connecting = voice.connect("Mayor", {
      missionId: "urban_repair",
      stepId: "diagnose",
      language: "english",
      attempt: 1,
      satisfiedCriteria: [],
      safetyIdentifier: "install_1234567890abcdef",
    }, {
      onState: vi.fn(),
      onMayorText: vi.fn(),
      onPrompt: vi.fn(),
    });

    voice.disconnect(false);
    resolveStream(stream);
    await connecting;

    expect(track.stop).toHaveBeenCalledOnce();
    expect(requestCredential).not.toHaveBeenCalled();
  });
});
