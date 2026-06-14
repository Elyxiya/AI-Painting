import { useEffect, useRef } from 'react';
import { useVoiceStore } from '@/stores/voice.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { executeCommand } from '@/services/commandExecutor';
import { routeCommand } from '@/services/workflow.service';
import type { LLMDecision } from '@/types/llm.types';

/**
 * Bridges voice transcription to the command pipeline.
 *
 * Route-first strategy:
 * 1. Try rule-based parsing (high confidence = execute directly)
 * 2. Low confidence / no match = ask LLM (DeepSeek API)
 * 3. LLM response validated by Zod before execution
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

      const result = await routeCommand(current);

      if (result.strategy === 'rule' && result.command) {
        executeCommand(result.command, { canvasStore: useCanvasStore });
      } else if (result.strategy === 'llm' && result.decision && result.decision.action !== 'noop') {
        const cmd = llmDecisionToCommand(result.decision);
        if (cmd) {
          executeCommand(cmd, { canvasStore: useCanvasStore });
        }
      }

      // Only clear transcript if we actually had something to act on
      if (result.command || result.decision) {
        useVoiceStore.getState().setTranscript('');
      }
    });

    return unsubscribe;
  }, []);
}

function llmDecisionToCommand(decision: LLMDecision) {
  const p = decision.params ?? {};
  switch (decision.action) {
    case 'drawShape':
      return {
        command: 'drawShape',
        color: (p.color as string) ?? '#000000',
        shapeType: (p.shapeType as 'rectangle' | 'ellipse' | 'line' | 'path' | 'text' | 'image') ?? 'rectangle',
      } as Parameters<typeof executeCommand>[0];

    case 'delete':
      return { command: 'delete' } as Parameters<typeof executeCommand>[0];
    case 'undo':
      return { command: 'undo' } as Parameters<typeof executeCommand>[0];
    case 'redo':
      return { command: 'redo' } as Parameters<typeof executeCommand>[0];
    case 'clearAll':
      return { command: 'clearAll' } as Parameters<typeof executeCommand>[0];
    default:
      return null;
  }
}

export default useVoiceCommand;
