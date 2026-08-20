import { uiText, type UiCopyKey } from '../client/ui-copy';
import type { Language } from '../domain/mission-contracts';

export const VOICE_UI_STATES = [
  'ready', 'connecting', 'listening', 'speaking',
  'permission_denied', 'error', 'unavailable',
] as const;

export type VoiceUiState = (typeof VOICE_UI_STATES)[number];

export function classifyVoiceFailure(error: unknown): Extract<VoiceUiState, 'permission_denied' | 'error'> {
  return error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission_denied' : 'error';
}

const STATUS_KEYS: Record<VoiceUiState, UiCopyKey> = {
  ready: 'voice_ready',
  connecting: 'voice_connecting',
  listening: 'voice_listening',
  speaking: 'voice_speaking',
  permission_denied: 'voice_permission_denied',
  error: 'voice_error',
  unavailable: 'voice_unavailable',
};

export function voicePresentation(language: Language, state: VoiceUiState) {
  const active = state === 'connecting' || state === 'listening' || state === 'speaking';
  return {
    status: uiText(language, STATUS_KEYS[state]),
    action: uiText(language, state === 'unavailable' ? 'voice_unavailable_action' : active ? 'stop_voice' : 'start_voice'),
    returnToText: uiText(language, 'return_to_text'),
  };
}
