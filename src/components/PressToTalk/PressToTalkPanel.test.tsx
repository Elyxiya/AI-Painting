import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PressToTalkPanel } from './PressToTalkPanel';
import { useVoiceStore } from '@/stores/voice.store';
import type { TranscriptionStatus } from '@/shared/types';

function setStatus(status: TranscriptionStatus) {
  useVoiceStore.setState((state) => {
    state.transcription.status = status;
  });
}

function setTranscript(finalText: string, interimText = '') {
  useVoiceStore.setState((state) => {
    state.transcription.finalText = finalText;
    state.transcription.interimText = interimText;
  });
}

beforeEach(() => {
  useVoiceStore.getState().reset();
});

describe('PressToTalkPanel', () => {
  it('renders the PTT button', () => {
    render(<PressToTalkPanel />);
    expect(screen.getByTestId('ptt-button')).toBeInTheDocument();
    expect(screen.getByTestId('ptt-panel')).toBeInTheDocument();
  });

  it('does not render transcript display when empty', () => {
    render(<PressToTalkPanel />);
    expect(screen.queryByTestId('transcript-display')).not.toBeInTheDocument();
  });

  it('renders final text when present', () => {
    setStatus('idle');
    setTranscript('画一个红色矩形');
    render(<PressToTalkPanel />);
    expect(screen.getByTestId('final-text')).toHaveTextContent('画一个红色矩形');
  });

  it('renders interim text when present', () => {
    setStatus('recording');
    setTranscript('', '画一个');
    render(<PressToTalkPanel />);
    expect(screen.getByTestId('interim-text')).toHaveTextContent('画一个');
  });

  it('renders both final and interim text', () => {
    setStatus('transcribing');
    setTranscript('画一个', '圆');
    render(<PressToTalkPanel />);
    expect(screen.getByTestId('final-text')).toHaveTextContent('画一个');
    expect(screen.getByTestId('interim-text')).toHaveTextContent('圆');
  });

  it('does not show transcript after reset', () => {
    setTranscript('画矩形');
    useVoiceStore.getState().reset();
    render(<PressToTalkPanel />);
    expect(screen.queryByTestId('transcript-display')).not.toBeInTheDocument();
  });
});
