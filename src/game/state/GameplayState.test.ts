import { describe, it, expect } from 'vitest';
import {
  createGameplayState,
  updateGameplayState,
  subscribeGameplayState,
  resetGameplayState,
} from './GameplayState';

describe('GameplayState', () => {
  it('creates an empty initial state', () => {
    const state = createGameplayState();

    expect(state.discoveredNodeIds).toEqual([]);
    expect(state.collectedResourceIds).toEqual([]);
    expect(state.analyzedSampleIds).toEqual([]);
    expect(state.craftedEquipmentIds).toEqual([]);
    expect(state.completedPracticeIds).toEqual([]);
    expect(state.unlockedProgressionIds).toEqual([]);
  });

  it('handles all six gameplay actions', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'DISCOVER_NODE',
      id: 'node-1',
    });
    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-1',
    });
    state = updateGameplayState(state, {
      type: 'ANALYZE_SAMPLE',
      id: 'sample-1',
    });
    state = updateGameplayState(state, {
      type: 'CRAFT_EQUIPMENT',
      id: 'equipment-1',
    });
    state = updateGameplayState(state, {
      type: 'COMPLETE_PRACTICE',
      id: 'practice-1',
    });
    state = updateGameplayState(state, {
      type: 'UNLOCK_PROGRESSION',
      id: 'progress-1',
    });

    expect(state.discoveredNodeIds).toContain('node-1');
    expect(state.collectedResourceIds).toContain('crystal-1');
    expect(state.analyzedSampleIds).toContain('sample-1');
    expect(state.craftedEquipmentIds).toContain('equipment-1');
    expect(state.completedPracticeIds).toContain('practice-1');
    expect(state.unlockedProgressionIds).toContain('progress-1');
  });

  it('does not add duplicate IDs', () => {
    const state = createGameplayState();

    const first = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-1',
    });

    const second = updateGameplayState(first, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-1',
    });

    expect(second.collectedResourceIds).toEqual(['crystal-1']);
    expect(second).toBe(first);
  });

  it('ignores blank or whitespace-only IDs', () => {
    const state = createGameplayState();

    const blank = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: '',
    });

    const whitespace = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: '   ',
    });

    expect(blank).toBe(state);
    expect(whitespace).toBe(state);
    expect(state.collectedResourceIds).toEqual([]);
  });

  it('trims whitespace around IDs', () => {
    const state = updateGameplayState(createGameplayState(), {
      type: 'COLLECT_RESOURCE',
      id: '  crystal-1  ',
    });

    expect(state.collectedResourceIds).toEqual(['crystal-1']);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const received: string[][] = [];

    const unsubscribe = subscribeGameplayState((state) => {
      received.push(state.collectedResourceIds);
    });

    updateGameplayState(createGameplayState(), {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-1',
    });

    unsubscribe();

    updateGameplayState(createGameplayState(), {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-2',
    });

    expect(received).toEqual([['crystal-1']]);
  });

  it('notifies subscribers when gameplay state resets', () => {
    const received: string[][] = [];

    const unsubscribe = subscribeGameplayState((state) => {
      received.push(state.collectedResourceIds);
    });

    resetGameplayState();

    unsubscribe();

    expect(received).toEqual([[]]);
  });
});