
import { describe, it, expect } from 'vitest';
import {
  initialGameplayState,
  createGameplayState,
  updateGameplayState,
  subscribeGameplayState,
  resetGameplayState,
  applyCollectSample,
  applyAnalyzeSample,
} from './GameplayState';

describe('GameplayState', () => {
  it('creates an empty state with chemistry maps', () => {
    const state = createGameplayState();

    expect(state.discoveredNodeIds).toEqual([]);
    expect(state.collectedResourceIds).toEqual([]);
    expect(Object.keys(state.researchSamplesById)).toEqual([]);
    expect(Object.keys(state.analysisResultsBySampleId)).toEqual([]);
    expect(state.craftedEquipmentIds).toEqual([]);
    expect(state.completedPracticeIds).toEqual([]);
    expect(state.unlockedProgressionIds).toEqual([]);

    expect(Object.getPrototypeOf(state.researchSamplesById)).toBe(null);
    expect(Object.getPrototypeOf(state.analysisResultsBySampleId)).toBe(null);
  });

  it('keeps the initial template immutable and creates independent states', () => {
    const first = createGameplayState();
    const second = createGameplayState();

    expect(Object.isFrozen(initialGameplayState)).toBe(true);
    expect(Object.isFrozen(initialGameplayState.collectedResourceIds)).toBe(true);
    expect(Object.isFrozen(initialGameplayState.researchSamplesById)).toBe(true);
    expect(Object.isFrozen(initialGameplayState.analysisResultsBySampleId)).toBe(true);

    expect(first).not.toBe(second);
    expect(first.collectedResourceIds).not.toBe(second.collectedResourceIds);
    expect(first.researchSamplesById).not.toBe(second.researchSamplesById);
    expect(first.analysisResultsBySampleId).not.toBe(
      second.analysisResultsBySampleId
    );

    first.collectedResourceIds.push('crystal-1');

    expect(second.collectedResourceIds).toEqual([]);
    expect(initialGameplayState.collectedResourceIds).toEqual([]);
  });

  it('handles all gameplay actions including sample collection and analysis', () => {
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
      type: 'COLLECT_SAMPLE',
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    state = updateGameplayState(state, {
      type: 'ANALYZE_SAMPLE',
      sampleId: 'sample:outcrop-350-315',
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

    expect(
      state.researchSamplesById['sample:outcrop-350-315']?.displayName
    ).toBe('Unidentified Mineral Sample');

    expect(
      state.analysisResultsBySampleId['sample:outcrop-350-315']?.resultCode
    ).toBe('UNIDENTIFIED_MINERAL');

    expect(state.craftedEquipmentIds).toContain('equipment-1');
    expect(state.completedPracticeIds).toContain('practice-1');
    expect(state.unlockedProgressionIds).toContain('progress-1');
  });

  it('does not add duplicate resource IDs', () => {
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

  it('ignores malformed runtime actions without crashing', () => {
    const state = createGameplayState();

    const result = updateGameplayState(state, null as never);

    expect(result).toBe(state);
  });

  it('ignores non-string runtime IDs without crashing', () => {
    const state = createGameplayState();

    const result = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 123,
    } as never);

    expect(result).toBe(state);
    expect(result.collectedResourceIds).toEqual([]);
  });

  it('trims whitespace around resource IDs', () => {
    const state = updateGameplayState(createGameplayState(), {
      type: 'COLLECT_RESOURCE',
      id: '  crystal-1  ',
    });

    expect(state.collectedResourceIds).toEqual(['crystal-1']);
  });

  it('collects a sample through the public transition wrapper', () => {
    const state = createGameplayState();

    const transition = applyCollectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(transition.result.ok).toBe(true);
    expect(transition.state).not.toBe(state);
    expect(
      transition.state.researchSamplesById['sample:outcrop-350-315']
    ).toBeDefined();
  });

  it('analyzes a collected sample through the public transition wrapper', () => {
    const collected = applyCollectSample(createGameplayState(), {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(collected.result.ok).toBe(true);

    const analyzed = applyAnalyzeSample(
      collected.state,
      'sample:outcrop-350-315'
    );

    expect(analyzed.result.ok).toBe(true);
    expect(analyzed.state).not.toBe(collected.state);

    if (analyzed.result.ok) {
      expect(analyzed.result.value.isVerified).toBe(false);
      expect(analyzed.result.value.identificationStatus).toBe('unidentified');
    }
  });

  it('does not analyze a sample that has not been collected', () => {
    const state = createGameplayState();

    const transition = applyAnalyzeSample(
      state,
      'sample:outcrop-350-315'
    );

    expect(transition.result).toEqual({
      ok: false,
      error: 'SAMPLE_NOT_FOUND',
    });

    expect(transition.state).toBe(state);
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

  it('does not retain the legacy analyzedSampleIds field', () => {
    const state = createGameplayState();

    expect('analyzedSampleIds' in state).toBe(false);
  });
});
