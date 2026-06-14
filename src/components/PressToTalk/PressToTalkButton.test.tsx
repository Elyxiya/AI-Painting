import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PressToTalkButton } from './PressToTalkButton';
import { useVoiceStore } from '@/stores/voice.store';
import type { TranscriptionStatus } from '@/shared/types';

// Mock voiceStore via a tiny selector shim: we don't need to mock the whole
// module since the real store already exists; we just call the real
// `setStatus`/`startRecording`/`stopRecording` actions to drive the UI.
function setStatus(status: TranscriptionStatus) {
  useVoiceStore.setState((state) => {
    state.transcription.status = status;
  });
}

beforeEach(() => {
  useVoiceStore.getState().reset();
});

describe('PressToTalkButton', () => {
  it('renders button with idle state', () => {
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', '按住说话按钮，当前状态：idle');
  });

  it('displays idle icon by default', () => {
    render(<PressToTalkButton />);
    expect(screen.getByTestId('ptt-button')).toHaveTextContent('🎤');
  });

  it('shows recording icon and pressed state when status is recording', () => {
    setStatus('recording');
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    expect(button).toHaveTextContent('⏹');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows transcribing icon when status is transcribing', () => {
    setStatus('transcribing');
    render(<PressToTalkButton />);
    expect(screen.getByTestId('ptt-button')).toHaveTextContent('📝');
  });

  it('shows error icon and disables the button when status is error', () => {
    setStatus('error');
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    expect(button).toHaveTextContent('⚠️');
    expect(button).toBeDisabled();
  });

  it('shows connecting icon when status is connecting', () => {
    setStatus('connecting');
    render(<PressToTalkButton />);
    expect(screen.getByTestId('ptt-button')).toHaveTextContent('🔄');
  });

  it('shows connected icon when status is connected', () => {
    setStatus('connected');
    render(<PressToTalkButton />);
    expect(screen.getByTestId('ptt-button')).toHaveTextContent('🔊');
  });

  it('pointerdown triggers startRecording when idle', async () => {
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    fireEvent.pointerDown(button);
    await waitFor(() => {
      expect(useVoiceStore.getState().transcription.status).toBe('recording');
    });
  });

  it('pointerup triggers stopRecording when recording', async () => {
    setStatus('recording');
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    fireEvent.pointerUp(button);
    await waitFor(() => {
      expect(useVoiceStore.getState().transcription.status).toBe('transcribing');
    });
  });

  it('pointerleave triggers stopRecording when recording', async () => {
    setStatus('recording');
    const { container } = render(<PressToTalkButton />);
    const button = container.querySelector('[data-testid="ptt-button"]')!;
    fireEvent.pointerLeave(button);
    await waitFor(() => {
      expect(useVoiceStore.getState().transcription.status).toBe('transcribing');
    });
  });

  it('does not trigger startRecording when error status', () => {
    setStatus('error');
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    fireEvent.pointerDown(button);
    expect(useVoiceStore.getState().transcription.status).toBe('error');
  });

  it('does not trigger stopRecording when not recording', () => {
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    fireEvent.pointerUp(button);
    expect(useVoiceStore.getState().transcription.status).toBe('idle');
  });

  it('has correct aria attributes for accessibility', () => {
    render(<PressToTalkButton />);
    const button = screen.getByTestId('ptt-button');
    expect(button).toHaveAttribute('aria-pressed');
    expect(button).toHaveAttribute('aria-label');
  });
});
