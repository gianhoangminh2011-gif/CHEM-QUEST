
import { describe, expect, it } from 'vitest';
import {
  FIRST_DISCOVERY_QUEST,
  getQuestProgress,
} from './QuestSystem';
import {
  createGameplayState,
  updateGameplayState,
  applyCollectSample,
  applyAnalyzeSample,
} from '../state/GameplayState';

describe('QuestSystem', () => {
  it('starts with incomplete objectives', () => {
    const progress = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      createGameplayState()
    );

    expect(progress.completed).toBe(false);
    expect(progress.objectives[0].currentCount).toBe(0);
    expect(progress.objectives[1].currentCount).toBe(0);
  });

  it('counts collection and analysis independently', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-1',
    });

    const collected = applyCollectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    state = collected.state;

    const beforeAnalysis = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(beforeAnalysis.objectives[0].currentCount).toBe(1);
    expect(beforeAnalysis.objectives[1].currentCount).toBe(0);

    const analyzed = applyAnalyzeSample(
      state,
      'sample:outcrop-350-315'
    );

    state = analyzed.state;

    const afterAnalysis = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(afterAnalysis.objectives[0].currentCount).toBe(1);
    expect(afterAnalysis.objectives[1].currentCount).toBe(1);
    expect(afterAnalysis.completed).toBe(false);
  });

  it('completes when all objectives reach their targets', () => {
    let state = createGameplayState();

    for (const id of ['crystal-1', 'crystal-2', 'crystal-3']) {
      state = updateGameplayState(state, {
        type: 'COLLECT_RESOURCE',
        id,
      });
    }

    const collected = applyCollectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    state = collected.state;

    const analyzed = applyAnalyzeSample(
      state,
      'sample:outcrop-350-315'
    );

    state = analyzed.state;

    expect(
      getQuestProgress(FIRST_DISCOVERY_QUEST, state).completed
    ).toBe(true);
  });
});
