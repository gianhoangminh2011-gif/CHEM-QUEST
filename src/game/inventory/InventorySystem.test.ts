
import { describe, it, expect } from 'vitest';
import {
  createGameplayState,
  applyCollectSample,
  applyAnalyzeSample,
  updateGameplayState,
} from '../state/GameplayState';
import {
  collectRuntimeResource,
  createRuntimeInventory,
  removeRuntimeResource,
} from './RuntimeInventorySystem';
import { getInventorySnapshot } from './InventorySystem';

describe('InventorySystem', () => {
  it('returns an empty inventory for new states', () => {
    const snapshot = getInventorySnapshot(
      createGameplayState(),
      createRuntimeInventory()
    );

    expect(snapshot).toEqual({
      resources: [],
      researchSamples: [],
      totalResourceTypes: 0,
      totalResourceQuantity: 0,
      totalResearchSamples: 0,
      analysedSamples: 0,
      unanalysedSamples: 0,
    });
  });

  it('lists canonical runtime resources with catalog records', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210'
    );

    expect(collected.ok).toBe(true);

    const snapshot = getInventorySnapshot(
      createGameplayState(),
      collected.state
    );

    expect(snapshot.resources).toHaveLength(1);
    expect(snapshot.resources[0]).toMatchObject({
      id: 'crystal-540-210',
      quantity: 1,
      element: {
        resourceId: 'crystal-540-210',
        name: 'Unidentified Crystal 01',
        identificationStatus: 'unidentified',
        atomicNumber: null,
      },
    });

    expect(snapshot.totalResourceTypes).toBe(1);
    expect(snapshot.totalResourceQuantity).toBe(1);
  });

  it('does not recreate consumed resources from collection history', () => {
    let gameplay = createGameplayState();

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210'
    );

    expect(collected.ok).toBe(true);

    const removed = removeRuntimeResource(
      collected.state,
      'crystal-540-210',
      1
    );

    expect(removed.ok).toBe(true);

    const snapshot = getInventorySnapshot(
      gameplay,
      removed.state
    );

    expect(snapshot.resources).toEqual([]);
    expect(snapshot.totalResourceQuantity).toBe(0);
  });

  it('does not count historical resources absent from runtime inventory', () => {
    let gameplay = createGameplayState();

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    const snapshot = getInventorySnapshot(
      gameplay,
      createRuntimeInventory()
    );

    expect(snapshot.resources).toEqual([]);
    expect(snapshot.totalResourceQuantity).toBe(0);
  });

  it('keeps unknown resources without inventing catalog data', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-unknown-01'
    );

    expect(collected.ok).toBe(true);

    const snapshot = getInventorySnapshot(
      createGameplayState(),
      collected.state
    );

    expect(snapshot.resources).toEqual([
      {
        id: 'crystal-unknown-01',
        quantity: 1,
        element: null,
      },
    ]);
  });

  it('counts distinct resource types and total quantity', () => {
    let inventory = createRuntimeInventory();

    const first = collectRuntimeResource(
      inventory,
      'crystal-540-210'
    );
    expect(first.ok).toBe(true);
    inventory = first.state;

    const second = collectRuntimeResource(
      inventory,
      'crystal-540-210'
    );
    expect(second.ok).toBe(true);
    inventory = second.state;

    const third = collectRuntimeResource(
      inventory,
      'crystal-760-335'
    );
    expect(third.ok).toBe(true);
    inventory = third.state;

    const snapshot = getInventorySnapshot(
      createGameplayState(),
      inventory
    );

    expect(snapshot.totalResourceTypes).toBe(2);
    expect(snapshot.totalResourceQuantity).toBe(3);
    expect(snapshot.resources.map((item) => item.id)).toEqual([
      'crystal-540-210',
      'crystal-760-335',
    ]);
  });

  it('lists collected research samples as not analysed', () => {
    const transition = applyCollectSample(createGameplayState(), {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(transition.result.ok).toBe(true);

    const snapshot = getInventorySnapshot(
      transition.state,
      createRuntimeInventory()
    );

    expect(snapshot.researchSamples).toEqual([
      {
        id: 'sample:outcrop-350-315',
        sourceId: 'outcrop-350-315',
        sampleType: 'unidentified-mineral',
        displayName: 'Unidentified Mineral Sample',
        analysed: false,
      },
    ]);

    expect(snapshot.totalResearchSamples).toBe(1);
    expect(snapshot.analysedSamples).toBe(0);
    expect(snapshot.unanalysedSamples).toBe(1);
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

    const snapshot = getInventorySnapshot(
      analysed.state,
      createRuntimeInventory()
    );

    expect(snapshot.researchSamples[0].analysed).toBe(true);
    expect(snapshot.totalResearchSamples).toBe(1);
    expect(snapshot.analysedSamples).toBe(1);
    expect(snapshot.unanalysedSamples).toBe(0);
  });

  it('does not mutate either source state while creating a snapshot', () => {
    const gameplay = createGameplayState();
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210'
    );

    expect(collected.ok).toBe(true);

    const resourceIdsBefore = [...gameplay.collectedResourceIds];
    const samplesBefore = { ...gameplay.researchSamplesById };
    const resourcesBefore = { ...collected.state.resources };

    getInventorySnapshot(gameplay, collected.state);

    expect(gameplay.collectedResourceIds).toEqual(resourceIdsBefore);
    expect(gameplay.researchSamplesById).toEqual(samplesBefore);
    expect(collected.state.resources).toEqual(resourcesBefore);
  });

  it('does not include malformed research sample records', () => {
    const gameplay = createGameplayState();

    gameplay.researchSamplesById['sample:invalid-record'] = {
      id: 'sample:different-id',
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
      displayName: 'Invalid Record',
    };

    const snapshot = getInventorySnapshot(
      gameplay,
      createRuntimeInventory()
    );

    expect(snapshot.researchSamples).toEqual([]);
    expect(snapshot.totalResearchSamples).toBe(0);
  });
});
