
import { describe, it, expect } from 'vitest';
import {
  GAMEPLAY_SAVE_KEY,
  GAMEPLAY_SAVE_SCHEMA_VERSION,
  saveGameplayState,
  loadGameplaySave,
  clearGameplaySave,
} from './GameplaySaveService';
import { createGameplayState } from './GameplayState';
import type { GameplayState } from './GameplayState';

class MemoryStorage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }

  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

describe('GameplaySaveService', () => {
  it('saves gameplay state with a versioned envelope', () => {
    const storage = new MemoryStorage();
    const state = createGameplayState();

    state.discoveredNodeIds.push('node-1');
    state.collectedResourceIds.push('crystal-1');

    const saved = saveGameplayState(
      state,
      storage as unknown as Storage
    );

    expect(saved).toBe(true);

    const raw = storage.getItem(GAMEPLAY_SAVE_KEY);

    expect(raw).not.toBeNull();

    const envelope = JSON.parse(raw!);

    expect(envelope.schemaVersion).toBe(
      GAMEPLAY_SAVE_SCHEMA_VERSION
    );

    expect(typeof envelope.savedAt).toBe('number');
    expect(envelope.state.discoveredNodeIds).toEqual(['node-1']);
    expect(envelope.state.collectedResourceIds).toEqual([
      'crystal-1',
    ]);
  });

  it('loads a previously saved gameplay state', () => {
    const storage = new MemoryStorage();
    const state = createGameplayState();

    state.discoveredNodeIds.push('node-1');
    state.collectedResourceIds.push('crystal-1');
    state.craftedEquipmentIds.push('equipment-1');
    state.completedPracticeIds.push('practice-1');
    state.unlockedProgressionIds.push('progress-1');

    expect(
      saveGameplayState(state, storage as unknown as Storage)
    ).toBe(true);

    const loaded = loadGameplaySave(
      storage as unknown as Storage
    );

    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(state);
  });

  it('preserves collected chemistry samples and analysis results', () => {
    const storage = new MemoryStorage();
    const state = createGameplayState();

    const sampleId = 'sample:outcrop-350-315';

    state.researchSamplesById[sampleId] = {
      id: sampleId,
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
      displayName: 'Unidentified Mineral Sample',
    };

    state.analysisResultsBySampleId[sampleId] = {
      sampleId,
      resultCode: 'UNIDENTIFIED_MINERAL',
      title: 'Unidentified Sample',
      summary: 'This sample has not been identified.',
      identificationStatus: 'unidentified',
      isVerified: false,
      disclaimer:
        'This result is a fictional in-game observation and is not a scientifically verified identification.',
    };

    expect(
      saveGameplayState(state, storage as unknown as Storage)
    ).toBe(true);

    const loaded = loadGameplaySave(
      storage as unknown as Storage
    );

    expect(loaded).not.toBeNull();
    expect(loaded?.researchSamplesById[sampleId]).toEqual(
      state.researchSamplesById[sampleId]
    );
    expect(
      loaded?.analysisResultsBySampleId[sampleId]
    ).toEqual(state.analysisResultsBySampleId[sampleId]);
  });

  it('restores chemistry maps as safe null-prototype objects', () => {
    const storage = new MemoryStorage();
    const state = createGameplayState();

    const sampleId = 'sample:outcrop-350-315';

    state.researchSamplesById[sampleId] = {
      id: sampleId,
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
      displayName: 'Unidentified Mineral Sample',
    };

    expect(
      saveGameplayState(state, storage as unknown as Storage)
    ).toBe(true);

    const loaded = loadGameplaySave(
      storage as unknown as Storage
    );

    expect(
      Object.getPrototypeOf(loaded?.researchSamplesById)
    ).toBe(null);

    expect(
      Object.getPrototypeOf(loaded?.analysisResultsBySampleId)
    ).toBe(null);
  });

  it('returns null when no save exists', () => {
    const storage = new MemoryStorage();

    expect(
      loadGameplaySave(storage as unknown as Storage)
    ).toBeNull();
  });

  it('rejects an unsupported save schema version', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      GAMEPLAY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: GAMEPLAY_SAVE_SCHEMA_VERSION + 1,
        savedAt: Date.now(),
        state: createGameplayState(),
      })
    );

    expect(
      loadGameplaySave(storage as unknown as Storage)
    ).toBeNull();
  });

  it('rejects malformed JSON', () => {
    const storage = new MemoryStorage();

    storage.setItem(GAMEPLAY_SAVE_KEY, '{invalid-json');

    expect(
      loadGameplaySave(storage as unknown as Storage)
    ).toBeNull();
  });

  it('rejects a save with missing gameplay fields', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      GAMEPLAY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: GAMEPLAY_SAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        state: {
          discoveredNodeIds: [],
        },
      })
    );

    expect(
      loadGameplaySave(storage as unknown as Storage)
    ).toBeNull();
  });

  it('rejects an orphaned analysis result', () => {
    const storage = new MemoryStorage();
    const state = createGameplayState();

    state.analysisResultsBySampleId[
      'sample:outcrop-350-315'
    ] = {
      sampleId: 'sample:outcrop-350-315',
      resultCode: 'UNIDENTIFIED_MINERAL',
      title: 'Unidentified Sample',
      summary: 'This sample has not been identified.',
      identificationStatus: 'unidentified',
      isVerified: false,
      disclaimer: 'Fictional result.',
    };

    storage.setItem(
      GAMEPLAY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: GAMEPLAY_SAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        state,
      })
    );

    expect(
      loadGameplaySave(storage as unknown as Storage)
    ).toBeNull();
  });

  it('does not save an invalid gameplay state', () => {
    const storage = new MemoryStorage();

    const invalidState = {
      discoveredNodeIds: 'not-an-array',
    } as unknown as GameplayState;

    expect(
      saveGameplayState(
        invalidState,
        storage as unknown as Storage
      )
    ).toBe(false);

    expect(storage.getItem(GAMEPLAY_SAVE_KEY)).toBeNull();
  });

  it('clears an existing save', () => {
    const storage = new MemoryStorage();
    const state = createGameplayState();

    expect(
      saveGameplayState(state, storage as unknown as Storage)
    ).toBe(true);

    expect(
      clearGameplaySave(storage as unknown as Storage)
    ).toBe(true);

    expect(storage.getItem(GAMEPLAY_SAVE_KEY)).toBeNull();
  });

  it('handles storage write errors safely', () => {
    const brokenStorage = {
      setItem() {
        throw new Error('Storage unavailable');
      },
    } as unknown as Storage;

    expect(saveGameplayState(createGameplayState(), brokenStorage))
      .toBe(false);
  });

  it('handles storage read errors safely', () => {
    const brokenStorage = {
      getItem() {
        throw new Error('Storage unavailable');
      },
    } as unknown as Storage;

    expect(loadGameplaySave(brokenStorage)).toBeNull();
  });

  it('handles storage removal errors safely', () => {
    const brokenStorage = {
      removeItem() {
        throw new Error('Storage unavailable');
      },
    } as unknown as Storage;

    expect(clearGameplaySave(brokenStorage)).toBe(false);
  });
});
