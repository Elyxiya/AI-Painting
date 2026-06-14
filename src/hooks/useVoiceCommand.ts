import { useEffect, useRef } from 'react';
import { useVoiceStore } from '@/stores/voice.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { executeCommand } from '@/services/commandExecutor';
import { routeCommand, llmDecisionToCommand } from '@/services/workflow.service';

/**
 * Bridges voice transcription to the command pipeline.
 *
 * Routing strategy (v2):
 * 1. Try the regex rule engine first (high confidence = execute directly)
 * 2. Low confidence / no match + LLM configured → ask DeepSeek
 * 3. LLM response validated by Zod, converted to a Command if possible
 * 4. Unknown/un-parseable input is left in the transcript for the user
 *    to see that nothing was recognised.
 */
export function useVoiceCommand(): void {
  const lastTranscriptRef = useRef<string>('');

  useEffect(() => {
    const unsubscribe = useVoiceStore.subscribe(async (state, prev) => {
      const current = state.transcription.finalText;
      if (!current || current === prev.transcription.finalText) {
        return;
      }
      if (current === lastTranscriptRef.current) {
        return;
      }
      lastTranscriptRef.current = current;

      const route = await routeCommand(current);

      if (route.strategy === 'rule' && route.command) {
        executeCommand(route.command, { canvasStore: useCanvasStore });
        useVoiceStore.getState().setTranscript('');
        return;
      }

      if (route.strategy === 'llm' && route.decision) {
        const cmd = llmDecisionToCommand(route.decision);
        if (cmd) {
          executeCommand(cmd, { canvasStore: useCanvasStore });
          useVoiceStore.getState().setTranscript('');
        }
      }
    });

    return unsubscribe;
  }, []);
}

export default useVoiceCommand;
