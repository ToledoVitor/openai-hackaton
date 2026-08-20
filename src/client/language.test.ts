import { afterEach, describe, expect, it, vi } from "vitest";

import { getStoredLanguage, LANGUAGE_CHANGE_EVENT, setPlayerLanguage } from "./language";

afterEach(() => vi.unstubAllGlobals());

describe("language selection", () => {
  it("applies immediately and persists for reload", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const events: Event[] = [];
    vi.stubGlobal("window", {
      localStorage: storage,
      dispatchEvent: (event: Event) => { events.push(event); return true; },
    });

    setPlayerLanguage("english");

    expect(getStoredLanguage(storage)).toBe("english");
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe(LANGUAGE_CHANGE_EVENT);
    expect((events[0] as CustomEvent).detail).toBe("english");
  });
});
