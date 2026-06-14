import { describe, it, expect, beforeEach } from 'vitest';
import { useFileStore } from './file.store';

describe('fileStore - auto-save status', () => {
  beforeEach(() => {
    useFileStore.getState().reset();
  });

  describe('initial state', () => {
    it('has new status on reset', () => {
      expect(useFileStore.getState().status).toBe('new');
    });

    it('has auto-save enabled by default', () => {
      const state = useFileStore.getState();
      expect(state.autoSave.enabled).toBe(true);
      expect(state.autoSave.lastSave).toBeNull();
    });

    it('has null currentProject on reset', () => {
      expect(useFileStore.getState().currentProject).toBeNull();
    });
  });

  describe('markModified', () => {
    it('changes status to modified', () => {
      useFileStore.getState().markModified();
      expect(useFileStore.getState().status).toBe('modified');
    });

    it('can transition from saved to modified', () => {
      useFileStore.getState().setStatus('saved');
      useFileStore.getState().markModified();
      expect(useFileStore.getState().status).toBe('modified');
    });

    it('can transition from error to modified', () => {
      useFileStore.getState().setStatus('error');
      useFileStore.getState().markModified();
      expect(useFileStore.getState().status).toBe('modified');
    });
  });

  describe('setSaving', () => {
    it('changes status to saving', () => {
      useFileStore.getState().setSaving();
      expect(useFileStore.getState().status).toBe('saving');
    });

    it('can transition from modified to saving', () => {
      useFileStore.getState().markModified();
      useFileStore.getState().setSaving();
      expect(useFileStore.getState().status).toBe('saving');
    });
  });

  describe('setError', () => {
    it('changes status to error', () => {
      useFileStore.getState().setError();
      expect(useFileStore.getState().status).toBe('error');
    });

    it('can transition from saving to error', () => {
      useFileStore.getState().setSaving();
      useFileStore.getState().setError();
      expect(useFileStore.getState().status).toBe('error');
    });
  });

  describe('setSaved', () => {
    it('changes status to saved and updates lastSave', () => {
      const before = Date.now();
      useFileStore.getState().markModified();
      useFileStore.getState().setSaved();
      const after = Date.now();

      expect(useFileStore.getState().status).toBe('saved');
      const lastSave = useFileStore.getState().autoSave.lastSave;
      expect(lastSave).toBeGreaterThanOrEqual(before);
      expect(lastSave).toBeLessThanOrEqual(after);
    });

    it('can transition from error to saved after retry', () => {
      useFileStore.getState().setError();
      useFileStore.getState().markModified();
      useFileStore.getState().setSaving();
      useFileStore.getState().setSaved();
      expect(useFileStore.getState().status).toBe('saved');
    });
  });

  describe('setStatus', () => {
    it('can directly set any status', () => {
      const store = useFileStore.getState();
      store.setStatus('saving');
      expect(useFileStore.getState().status).toBe('saving');

      store.setStatus('saved');
      expect(useFileStore.getState().status).toBe('saved');

      store.setStatus('modified');
      expect(useFileStore.getState().status).toBe('modified');
    });
  });

  describe('reset', () => {
    it('restores initial state including status', () => {
      const store = useFileStore.getState();
      store.markModified();
      store.setSaving();
      store.setError();

      store.reset();

      expect(useFileStore.getState().status).toBe('new');
    });
  });

  describe('auto-save control', () => {
    it('can enable auto-save', () => {
      useFileStore.getState().disableAutoSave();
      expect(useFileStore.getState().autoSave.enabled).toBe(false);

      useFileStore.getState().enableAutoSave();
      expect(useFileStore.getState().autoSave.enabled).toBe(true);
    });

    it('can disable auto-save', () => {
      useFileStore.getState().disableAutoSave();
      expect(useFileStore.getState().autoSave.enabled).toBe(false);
    });

    it('can update auto-save interval', () => {
      const store = useFileStore.getState();
      store.setAutoSaveInterval(30000);
      expect(useFileStore.getState().autoSave.interval).toBe(30000);
    });
  });
});
