import React from 'react';
import { PressToTalkButton } from './PressToTalkButton';
import { useVoiceStore } from '@/stores/voice.store';
import styles from './PressToTalkPanel.module.css';

export const PressToTalkPanel: React.FC = () => {
  const transcription = useVoiceStore((s) => s.transcription);

  const hasTranscript = transcription.finalText || transcription.interimText;

  return (
    <div className={styles.panel} data-testid="ptt-panel">
      <PressToTalkButton />
      {hasTranscript && (
        <div className={styles.transcript} data-testid="transcript-display">
          {transcription.finalText && (
            <div className={styles.finalText} data-testid="final-text">
              {transcription.finalText}
            </div>
          )}
          {transcription.interimText && (
            <div className={styles.interimText} data-testid="interim-text">
              {transcription.interimText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PressToTalkPanel;
