import type { StorageLike } from "./quest-storage";

export const INSTALLATION_ID_STORAGE_KEY = "ai-city-mayor:installation-id:v1";

const INSTALLATION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export interface CryptoSource {
  getRandomValues(bytes: Uint8Array): Uint8Array;
}

export function isValidInstallationId(value: unknown): value is string {
  return typeof value === "string" && INSTALLATION_ID_PATTERN.test(value);
}

export function createInstallationId(crypto: CryptoSource): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getOrCreateInstallationId(
  storage: StorageLike | null | undefined,
  crypto: CryptoSource,
): string {
  let storedId: string | null = null;
  try {
    storedId = storage?.getItem(INSTALLATION_ID_STORAGE_KEY) ?? null;
  } catch {
    storedId = null;
  }

  if (isValidInstallationId(storedId)) {
    return storedId;
  }

  const installationId = createInstallationId(crypto);
  try {
    storage?.setItem(INSTALLATION_ID_STORAGE_KEY, installationId);
  } catch {
    // Storage can be disabled without blocking a session-safe identifier.
  }
  return installationId;
}
