import { describe, expect, it } from 'vitest';
import { classifyVoiceFailure, VOICE_UI_STATES, voicePresentation } from './voice-state';

describe('optional voice presentation', () => {
  it.each(['portuguese', 'english'] as const)('covers every recoverable state in %s', (language) => {
    for (const state of VOICE_UI_STATES) {
      const view = voicePresentation(language, state);
      expect(view.status.length).toBeGreaterThan(3);
      expect(view.action.length).toBeGreaterThan(3);
      expect(view.returnToText.length).toBeGreaterThan(3);
    }
  });

  it('keeps voice explicitly optional and text path available after denial', () => {
    const denied = voicePresentation('english', 'permission_denied');
    expect(denied.status).toContain('permission');
    expect(denied.returnToText).toBe('Return to text');
  });

  it('distinguishes microphone denial from recoverable connection errors', () => {
    expect(classifyVoiceFailure(new DOMException('blocked', 'NotAllowedError'))).toBe('permission_denied');
    expect(classifyVoiceFailure(new Error('offline'))).toBe('error');
  });
});
