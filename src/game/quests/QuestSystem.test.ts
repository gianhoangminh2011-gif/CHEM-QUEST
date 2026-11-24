
import { describe, expect, it } from 'vitest';
import {
  FIRST_DISCOVERY_QUEST,
  getQuestProgress,
  type QuestDefinition,
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
    expect(progress.objectives[2].currentCount).toBe(0);
  });

  it('counts only resources matching target IDs', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'unrelated-crystal',
    });

    const progress = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(progress.objectives[0].currentCount).toBe(1);
    expect(progress.objectives[0].completed).toBe(false);
  });

  it('does not count duplicate resource events twice', () => {
    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    const first = state;

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    expect(state).toBe(first);

    const progress = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(progress.objectives[0].currentCount).toBe(1);
  });

  it('counts only discovered nodes matching target IDs', () => {
    const quest: QuestDefinition = {
      id: 'node-test',
      title: 'Node Test',
      description: 'Discover a specific node.',
      objectives: [
        {
          id: 'discover-node',
          description: 'Discover target node',
          type: 'DISCOVER_NODE',
          targetIds: ['node-emerald-01'],
          targetCount: 1,
        },
      ],
    };

    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'DISCOVER_NODE',
      id: 'node-unrelated',
    });

    expect(getQuestProgress(quest, state).completed).toBe(false);

    state = updateGameplayState(state, {
      type: 'DISCOVER_NODE',
      id: 'node-emerald-01',
    });

    expect(getQuestProgress(quest, state).completed).toBe(true);
  });

  it('counts only collected samples matching target IDs', () => {
    const quest: QuestDefinition = {
      id: 'sample-test',
      title: 'Sample Test',
      description: 'Collect a specific sample.',
      objectives: [
        {
          id: 'collect-sample',
          description: 'Collect target sample',
          type: 'COLLECT_SAMPLE',
          targetIds: ['sample:outcrop-350-315'],
          targetCount: 1,
        },
      ],
    };

    let state = createGameplayState();

    const collected = applyCollectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    state = collected.state;

    expect(collected.result.ok).toBe(true);
    expect(getQuestProgress(quest, state).completed).toBe(true);
  });

  it('does not count analysis of an unrelated sample', () => {
    let state = createGameplayState();

    const collected = applyCollectSample(state, {
      sourceId: 'unrelated-outcrop',
      sampleType: 'unidentified-mineral',
    });

    state = collected.state;

    const analyzed = applyAnalyzeSample(
      state,
      'sample:unrelated-outcrop'
    );

    state = analyzed.state;

    const progress = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(progress.objectives[2].currentCount).toBe(0);
    expect(progress.objectives[2].completed).toBe(false);
  });

  it('counts analysis only after the target sample is collected and analyzed', () => {
    let state = createGameplayState();

    const collected = applyCollectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    state = collected.state;

    const beforeAnalysis = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(beforeAnalysis.objectives[1].currentCount).toBe(1);
    expect(beforeAnalysis.objectives[2].currentCount).toBe(0);

    const analyzed = applyAnalyzeSample(
      state,
      'sample:outcrop-350-315'
    );

    state = analyzed.state;

    const afterAnalysis = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(afterAnalysis.objectives[2].currentCount).toBe(1);
    expect(afterAnalysis.objectives[2].completed).toBe(true);
  });

  it('completes only when every target objective is satisfied', () => {
    let state = createGameplayState();

    for (const id of [
      'crystal-540-210',
      'crystal-760-335',
      'crystal-225-310',
    ]) {
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

    const progress = getQuestProgress(
      FIRST_DISCOVERY_QUEST,
      state
    );

    expect(progress.objectives.every((item) => item.completed)).toBe(true);
    expect(progress.completed).toBe(true);
  });

  it('does not complete an objective with invalid target count', () => {
    const quest: QuestDefinition = {
      id: 'invalid-target',
      title: 'Invalid Target',
      description: 'Invalid configuration test.',
      objectives: [
        {
          id: 'invalid',
          description: 'Invalid objective',
          type: 'COLLECT_RESOURCE',
          targetIds: ['crystal-540-210'],
          targetCount: 0,
        },
      ],
    };

    const state = updateGameplayState(createGameplayState(), {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-540-210',
    });

    const progress = getQuestProgress(quest, state);

    expect(progress.objectives[0].currentCount).toBe(0);
    expect(progress.completed).toBe(false);
  });
});
