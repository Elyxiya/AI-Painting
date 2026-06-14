import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  routeCommand,
  commandToAction,
  llmDecisionToCommand,
  RULE_CONFIDENCE_THRESHOLD,
} from './workflow.service';

const mockAsk = vi.fn();
const mockIsConfigured = vi.fn();

vi.mock('./llm.service', () => ({
  llmService: {
    ask: (...args: unknown[]) => mockAsk(...args),
    isConfigured: () => mockIsConfigured(),
  },
}));

describe('workflow.service', () => {
  beforeEach(() => {
    mockAsk.mockReset();
    mockIsConfigured.mockReset();
    mockIsConfigured.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('routeCommand — rule path', () => {
    it('returns the rule command with confidence 1.0 for a known Chinese draw command', async () => {
      const route = await routeCommand('画红色矩形');
      expect(route.strategy).toBe('rule');
      if (route.strategy === 'rule') {
        expect(route.confidence).toBe(1.0);
        expect(route.command).toEqual({ command: 'drawShape', color: '#FF0000', shapeType: 'rectangle' });
      }
    });

    it('returns a rule command for "撤销"', async () => {
      const route = await routeCommand('撤销');
      expect(route.strategy).toBe('rule');
      if (route.strategy === 'rule') {
        expect(route.command).toEqual({ command: 'undo' });
      }
    });

    it('returns a rule command for "清空"', async () => {
      const route = await routeCommand('清空');
      expect(route.strategy).toBe('rule');
      if (route.strategy === 'rule') {
        expect(route.command).toEqual({ command: 'clearAll' });
      }
    });

    it('returns an empty rule route for an empty input', async () => {
      const route = await routeCommand('   ');
      expect(route.strategy).toBe('rule');
      if (route.strategy === 'rule') {
        expect(route.command).toBeNull();
        expect(route.confidence).toBe(0);
      }
    });

    it('falls back to a null command (not the LLM) when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const route = await routeCommand('something the rule engine does not understand');
      expect(route.strategy).toBe('rule');
      if (route.strategy === 'rule') {
        expect(route.command).toBeNull();
      }
      expect(mockAsk).not.toHaveBeenCalled();
    });
  });

  describe('routeCommand — LLM path', () => {
    it('asks the LLM when rule misses and LLM is configured', async () => {
      mockIsConfigured.mockReturnValue(true);
      mockAsk.mockResolvedValueOnce({ action: 'drawShape', params: { shapeType: 'ellipse', color: '#ABCDEF' } });

      const route = await routeCommand('please draw a blue ellipse');
      expect(route.strategy).toBe('llm');
      if (route.strategy === 'llm') {
        expect(route.decision.action).toBe('drawShape');
        expect(route.decision.params).toEqual({ shapeType: 'ellipse', color: '#ABCDEF' });
      }
      expect(mockAsk).toHaveBeenCalledWith('please draw a blue ellipse');
    });

    it('falls back to a null command when the LLM returns null', async () => {
      mockIsConfigured.mockReturnValue(true);
      mockAsk.mockResolvedValueOnce(null);
      const route = await routeCommand('nonsense');
      expect(route.strategy).toBe('rule');
      if (route.strategy === 'rule') {
        expect(route.command).toBeNull();
      }
    });

    it('passes the trimmed text to the LLM', async () => {
      mockIsConfigured.mockReturnValue(true);
      mockAsk.mockResolvedValueOnce({ action: 'undo', params: {} });
      await routeCommand('   undo please   ');
      expect(mockAsk).toHaveBeenCalledWith('undo please');
    });
  });

  describe('commandToAction', () => {
    it('converts a drawShape command', () => {
      expect(commandToAction({ command: 'drawShape', color: '#000', shapeType: 'rectangle' })).toEqual({
        action: 'drawShape',
        params: { shapeType: 'rectangle', color: '#000' },
      });
    });

    it('converts a delete command', () => {
      expect(commandToAction({ command: 'delete' })).toEqual({ action: 'delete', params: {} });
    });

    it('converts an undo command', () => {
      expect(commandToAction({ command: 'undo' })).toEqual({ action: 'undo', params: {} });
    });

    it('converts a redo command', () => {
      expect(commandToAction({ command: 'redo' })).toEqual({ action: 'redo', params: {} });
    });

    it('converts a clearAll command', () => {
      expect(commandToAction({ command: 'clearAll' })).toEqual({ action: 'clearAll', params: {} });
    });
  });

  describe('llmDecisionToCommand', () => {
    it('converts a drawShape decision with explicit color and shape', () => {
      expect(
        llmDecisionToCommand({ action: 'drawShape', params: { shapeType: 'ellipse', color: '#FF00FF' } }),
      ).toEqual({ command: 'drawShape', color: '#FF00FF', shapeType: 'ellipse' });
    });

    it('defaults to black rectangle when drawShape params are sparse', () => {
      expect(llmDecisionToCommand({ action: 'drawShape', params: {} })).toEqual({
        command: 'drawShape',
        color: '#000000',
        shapeType: 'rectangle',
      });
    });

    it('returns a delete command', () => {
      expect(llmDecisionToCommand({ action: 'delete', params: {} })).toEqual({ command: 'delete' });
    });

    it('returns an undo command', () => {
      expect(llmDecisionToCommand({ action: 'undo', params: {} })).toEqual({ command: 'undo' });
    });

    it('returns a redo command', () => {
      expect(llmDecisionToCommand({ action: 'redo', params: {} })).toEqual({ command: 'redo' });
    });

    it('returns a clearAll command', () => {
      expect(llmDecisionToCommand({ action: 'clearAll', params: {} })).toEqual({ command: 'clearAll' });
    });

    it('returns null for actions the executor cannot handle', () => {
      expect(llmDecisionToCommand({ action: 'moveShape', params: {} })).toBeNull();
      expect(llmDecisionToCommand({ action: 'resizeShape', params: {} })).toBeNull();
      expect(llmDecisionToCommand({ action: 'changeColor', params: {} })).toBeNull();
      expect(llmDecisionToCommand({ action: 'noop', params: {} })).toBeNull();
    });
  });

  describe('RULE_CONFIDENCE_THRESHOLD', () => {
    it('is exported at 0.9 (the design value)', () => {
      expect(RULE_CONFIDENCE_THRESHOLD).toBe(0.9);
    });
  });
});
