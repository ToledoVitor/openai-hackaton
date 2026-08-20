import {
  parseJourneyState,
  serializeJourneyState,
  type JourneyState,
} from "../domain/learning-journey";

export const JOURNEY_STORAGE_KEY = "ai-city:learning-journey:v1";
export const PROGRESS_RECEIPT_STORAGE_KEY = "ai-city:progress-receipt:v1";

type JourneyStorage = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

export function loadJourneyState(storage: JourneyStorage | null | undefined): JourneyState {
  if (!storage) return parseJourneyState(null);
  try {
    return parseJourneyState(storage.getItem(JOURNEY_STORAGE_KEY));
  } catch {
    return parseJourneyState(null);
  }
}

export function loadProgressReceipt(storage: JourneyStorage | null | undefined): string | undefined {
  if (!storage) return undefined;
  try {
    const value = storage.getItem(PROGRESS_RECEIPT_STORAGE_KEY);
    return value && value.length <= 2048 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveProgressReceipt(
  storage: JourneyStorage | null | undefined,
  receipt: string,
): boolean {
  if (!storage || receipt.length > 2048) return false;
  try {
    storage.setItem(PROGRESS_RECEIPT_STORAGE_KEY, receipt);
    return true;
  } catch {
    return false;
  }
}

export function clearProgressReceipt(storage: JourneyStorage | null | undefined): boolean {
  if (!storage?.removeItem) return false;
  try {
    storage.removeItem(PROGRESS_RECEIPT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveJourneyState(
  storage: JourneyStorage | null | undefined,
  state: JourneyState,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(JOURNEY_STORAGE_KEY, serializeJourneyState(state));
    return true;
  } catch {
    return false;
  }
}
