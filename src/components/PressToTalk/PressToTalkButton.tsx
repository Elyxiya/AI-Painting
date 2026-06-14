import React, { useCallback } from 'react';
import { useVoiceStore } from '@/stores/voice.store';
import type { TranscriptionStatus } from '@/shared/types';
import styles from './PressToTalkButton.module.css';

const STATUS_ICONS: Record<TranscriptionStatus, string> = {
  idle: '🎤',
  connecting: '🔄',
  connected: '🔊',
  recording: '⏹',
  transcribing: '📝',
  error: '⚠️',
};

const STATUS_CLASS_KEYS: Record<TranscriptionStatus, keyof typeof styles> = {
  idle: 'idle',
  connecting: 'connecting',
  connected: 'connected',
  recording: 'recording',
  transcribing: 'transcribing',
  error: 'error',
};

export const PressToTalkButton: React.FC = () => {
  const status = useVoiceStore((s) => s.transcription.status);
  const startRecording = useVoiceStore((s) => s.startRecording);
  const stopRecording = useVoiceStore((s) => s.stopRecording);

  const handlePointerDown = useCallback(() => {
    if (status === 'idle' || status === 'connected') {
      startRecording();
    }
  }, [status, startRecording]);

  const handlePointerUp = useCallback(() => {
    if (status === 'recording') {
      stopRecording();
    }
  }, [status, stopRecording]);

  const handlePointerLeave = useCallback(() => {
    if (status === 'recording') {
      stopRecording();
    }
  }, [status, stopRecording]);

  const classKey = STATUS_CLASS_KEYS[status] ?? 'idle';
  const buttonClass = [styles.button, styles[classKey] ?? ''].filter(Boolean).join(' ');

  const icon = STATUS_ICONS[status] ?? '🎤';

  return (
    <button
      className={buttonClass}
      data-testid="ptt-button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
      aria-label={`按住说话按钮，当前状态：${status}`}
      aria-pressed={status === 'recording'}
      disabled={status === 'error'}
    >
      <span className={styles.icon}>{icon}</span>
    </button>
  );
};

export default PressToTalkButton;
