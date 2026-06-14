import { useEffect, useRef } from 'react';
import { useVoiceStore } from '@/stores/voice.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { parseCommand } from '@/services/commandParser';
import { executeCommand } from '@/services/commandExecutor';

/**
 * Bridges voice transcription to the command pipeline.
 *
 * Watches `voiceStore.transcription.finalText`. When a new non-empty
 * transcript arrives, parses it into a Command and dispatches it to the
 * canvas store via `executeCommand`. Unknown commands leave the transcript
 * in place so the user can see that nothing was recognised.
 */
export function useVoiceCommand(): void {
  const lastTranscriptRef = useRef<string>('');

  useEffect(() => {
    const unsubscribe = useVoiceStore.subscribe((state, prev) => {
      const current = state.transcription.finalText;
      if (!current || current === prev.transcription.finalText) {
        return;
      }
      if (current === lastTranscriptRef.current) {
        return;
      }
      lastTranscriptRef.current = current;

      const command = parseCommand(current);
      if (!command) {
        return;
      }

      executeCommand(command, { canvasStore: useCanvasStore });
      useVoiceStore.getState().setTranscript('');
    });

    return unsubscribe;
  }, []);
}

export default useVoiceCommand;
