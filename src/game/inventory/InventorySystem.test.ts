
import { describe, it, expect } from 'vitest';
import {
  createGameplayState,
  updateGameplayState,
  applyCollectSample,
  applyAnalyzeSample,
} from '../state/GameplayState';
import { getInventorySnapshot } from './InventorySystem';

describe('InventorySystem', () => {
  it('returns an empty inventory for a new gameplay state', () => {
    const state = createGameplayState();

    expect(getInventorySnapshot(state)).toEqual({
      resources: [],
      researchSamples: [],
      totalResourceTypes: 0,
      totalResourceQuantity: 0,
      totalResearchSamples: 0,
      analysedSamples: 0,
      unanalysedSamples: 0,
    });
  });

  it('lists a collected crystal with its catalog record', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    const inventory = getInventorySnapshot(state);

    expect(inventory.resources).toHaveLength(1);
    expect(inventory.resources[0]).toMatchObject({
      id: 'crystal-540-210',
      quantity: 1,
      element: {
        resourceId: 'crystal-540-210',
        name: 'Unidentified Crystal 01',
        identificationStatus: 'unidentified',
        atomicNumber: null,
      },
    });

    expect(inventory.totalResourceTypes).toBe(1);
    expect(inventory.totalResourceQuantity).toBe(1);
  });

  it('keeps unknown resources without inventing catalog data', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'unknown-resource-01',
    });

    const inventory = getInventorySnapshot(state);

    expect(inventory.resources).toEqual([
      {
        id: 'unknown-resource-01',
        quantity: 1,
        element: null,
      },
    ]);
  });

  it('counts distinct collected resource types', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-760-335',
    });

    const inventory = getInventorySnapshot(state);

    expect(inventory.totalResourceTypes).toBe(2);
    expect(inventory.totalResourceQuantity).toBe(2);
    expect(inventory.resources.map((item) => item.id)).toEqual([
      'crystal-540-210',
      'crystal-760-335',
    ]);
  });

  it('counts duplicate IDs defensively if they exist in restored state', () => {
    const state = createGameplayState();

    state.collectedResourceIds.push(
      'crystal-540-210',
      'crystal-540-210'
    );

    const inventory = getInventorySnapshot(state);

    expect(inventory.totalResourceTypes).toBe(1);
    expect(inventory.totalResourceQuantity).toBe(2);
    expect(inventory.resources[0].quantity).toBe(2);
  });

  it('ignores blank resource IDs', () => {
    const state = createGameplayState();

    state.collectedResourceIds.push('', '   ');

    const inventory = getInventorySnapshot(state);

    expect(inventory.resources).toEqual([]);
    expect(inventory.totalResourceQuantity).toBe(0);
  });

  it('lists collected research samples as not analysed', () => {
    const transition = applyCollectSample(createGameplayState(), {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(transition.result.ok).toBe(true);

    const inventory = getInventorySnapshot(transition.state);

    expect(inventory.researchSamples).toEqual([
      {
        id: 'sample:outcrop-350-315',
        sourceId: 'outcrop-350-315',
        sampleType: 'unidentified-mineral',
        displayName: 'Unidentified Mineral Sample',
        analysed: false,
      },
    ]);

    expect(inventory.totalResearchSamples).toBe(1);
    expect(inventory.analysedSamples).toBe(0);
    expect(inventory.unanalysedSamples).toBe(1);
  });

  it('marks a research sample as analysed after analysis', () => {
    const collected = applyCollectSample(createGameplayState(), {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(collected.result.ok).toBe(true);

    const analysed = applyAnalyzeSample(
      collected.state,
      'sample:outcrop-350-315'
    );

    expect(analysed.result.ok).toBe(true);

    const inventory = getInventorySnapshot(analysed.state);

    expect(inventory.researchSamples[0].analysed).toBe(true);
    expect(inventory.totalResearchSamples).toBe(1);
    expect(inventory.analysedSamples).toBe(1);
    expect(inventory.unanalysedSamples).toBe(0);
  });

  it('does not mutate gameplay state while creating a snapshot', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    const resourceIdsBefore = [
      ...state.collectedResourceIds,
    ];

    const samplesBefore = {
      ...state.researchSamplesById,
    };

    const analysisBefore = {
      ...state.analysisResultsBySampleId,
    };

    getInventorySnapshot(state);

    expect(state.collectedResourceIds).toEqual(
      resourceIdsBefore
    );

    expect(state.researchSamplesById).toEqual(
      samplesBefore
    );

    expect(state.analysisResultsBySampleId).toEqual(
      analysisBefore
    );
  });

  it('does not include malformed research sample records', () => {
    const state = createGameplayState();

    state.researchSamplesById['sample:invalid-record'] = {
      id: 'sample:different-id',
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
      displayName: 'Invalid Record',
    };

    const inventory = getInventorySnapshot(state);

    expect(inventory.researchSamples).toEqual([]);
    expect(inventory.totalResearchSamples).toBe(0);
  });
});
