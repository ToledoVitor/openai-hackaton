import { describe, expect, test } from "vitest";
import * as installationId from "./installation-id";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function sequentialCrypto() {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    getRandomValues(bytes: Uint8Array) {
      calls += 1;
      bytes.forEach((_, index) => {
        bytes[index] = index;
      });
      return bytes;
    },
  };
}

describe("getOrCreateInstallationId", () => {
  test("creates and stores a backend-safe identifier from 128 random bits", () => {
    // This catches a shortened or non-url-safe client safety identifier.
    const storage = new MemoryStorage();
    const crypto = sequentialCrypto();

    const id = installationId.getOrCreateInstallationId(storage, crypto);

    expect(id).toBe("000102030405060708090a0b0c0d0e0f");
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(crypto.calls).toBe(1);
    expect(storage.getItem(installationId.INSTALLATION_ID_STORAGE_KEY)).toBe(id);
  });

  test("reuses a valid stored identifier without drawing more randomness", () => {
    // This catches a refresh silently rotating the safety identifier.
    const storage = new MemoryStorage();
    const crypto = sequentialCrypto();
    storage.setItem(installationId.INSTALLATION_ID_STORAGE_KEY, "stable_safety-id_123");

    expect(installationId.getOrCreateInstallationId(storage, crypto)).toBe("stable_safety-id_123");
    expect(crypto.calls).toBe(0);
  });

  test("replaces an invalid stored identifier", () => {
    // This catches malformed local storage being forwarded to the backend.
    const storage = new MemoryStorage();
    const crypto = sequentialCrypto();
    storage.setItem(installationId.INSTALLATION_ID_STORAGE_KEY, "too-short");

    const replacement = installationId.getOrCreateInstallationId(storage, crypto);

    expect(replacement).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(replacement).not.toBe("too-short");
    expect(storage.getItem(installationId.INSTALLATION_ID_STORAGE_KEY)).toBe(replacement);
  });

  test("still creates an identifier when storage is unavailable", () => {
    // This catches privacy-mode storage errors blocking a playable session.
    const unavailable = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };

    expect(installationId.getOrCreateInstallationId(unavailable, sequentialCrypto())).toMatch(
      /^[A-Za-z0-9_-]{16,128}$/,
    );
  });
});
