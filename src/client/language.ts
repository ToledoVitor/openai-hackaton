import type { Language } from '../domain/mission-contracts';

export const LANGUAGE_STORAGE_KEY = 'ai-city:language';
export const LANGUAGE_CHANGE_EVENT = 'ai-city:language-change';
export const DEFAULT_LANGUAGE: Language = 'portuguese';

export function isLanguage(value: unknown): value is Language {
  return value === 'portuguese' || value === 'english';
}

export function getStoredLanguage(storage: Pick<Storage, 'getItem'> | null | undefined): Language {
  if (!storage) return DEFAULT_LANGUAGE;

  try {
    const value = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(value) ? value : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function setPlayerLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language still applies for this session when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_CHANGE_EVENT, { detail: language }));
}
