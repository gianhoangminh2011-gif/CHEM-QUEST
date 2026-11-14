
import { describe, expect, it } from 'vitest';
import {
  FIRST_DISCOVERY_QUEST,
  getQuestProgress,
} from './QuestSystem';
import {
  createGameplayState,
  updateGameplayState,
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

    state = updateGameplayState(state, {
      type: 'ANALYZE_SAMPLE',
      id: 'sample-1',
    });

    const progress = getQuestProgress(FIRST_DISCOVERY_QUEST, state);

    expect(progress.objectives[0].currentCount).toBe(1);
    expect(progress.objectives[1].currentCount).toBe(1);
    expect(progress.completed).toBe(false);
  });

  it('completes when all objectives reach their targets', () => {
    let state = createGameplayState();

    for (const id of ['crystal-1', 'crystal-2', 'crystal-3']) {
      state = updateGameplayState(state, {
        type: 'COLLECT_RESOURCE',
        id,
      });
    }

    state = updateGameplayState(state, {
      type: 'ANALYZE_SAMPLE',
      id: 'sample-1',
    });

    expect(getQuestProgress(FIRST_DISCOVERY_QUEST, state).completed)
      .toBe(true);
  });
});