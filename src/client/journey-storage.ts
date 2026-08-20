import {
  parseJourneyState,
  serializeJourneyState,
  type JourneyState,
} from "../domain/learning-journey";

export const JOURNEY_STORAGE_KEY = "ai-city:learning-journey:v1";

type JourneyStorage = Pick<Storage, "getItem" | "setItem">;

export function loadJourneyState(storage: JourneyStorage | null | undefined): JourneyState {
  if (!storage) return parseJourneyState(null);
  try {
    return parseJourneyState(storage.getItem(JOURNEY_STORAGE_KEY));
  } catch {
    return parseJourneyState(null);
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
