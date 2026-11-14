import type { GameplayState } from '../state/GameplayState';

export type QuestObjectiveType =
  | 'COLLECT_RESOURCE'
  | 'ANALYZE_SAMPLE';

export interface QuestObjective {
  id: string;
  description: string;
  type: QuestObjectiveType;
  targetCount: number;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
}

export interface QuestObjectiveProgress {
  id: string;
  description: string;
  currentCount: number;
  targetCount: number;
  completed: boolean;
}

export interface QuestProgress {
  questId: string;
  completed: boolean;
  objectives: QuestObjectiveProgress[];
}

export const FIRST_DISCOVERY_QUEST: QuestDefinition = {
  id: 'first-discovery',
  title: 'The First Discovery',
  description:
    'Explore Emerald Frontier, collect crystals and analyze a mineral sample.',
  objectives: [
    {
      id: 'collect-crystals',
      description: 'Crystals collected',
      type: 'COLLECT_RESOURCE',
      targetCount: 3,
    },
    {
      id: 'analyze-mineral',
      description: 'Mineral samples analyzed',
      type: 'ANALYZE_SAMPLE',
      targetCount: 1,
    },
  ],
};

function getObjectiveCount(
  state: GameplayState,
  type: QuestObjectiveType
): number {
  switch (type) {
    case 'COLLECT_RESOURCE':
      return state.collectedResourceIds.length;

    case 'ANALYZE_SAMPLE':
      return state.analyzedSampleIds.length;

    default:
      return 0;
  }
}

export function getQuestProgress(
  quest: QuestDefinition,
  state: GameplayState
): QuestProgress {
  const objectives = quest.objectives.map((objective) => {
    const currentCount = getObjectiveCount(state, objective.type);

    return {
      id: objective.id,
      description: objective.description,
      currentCount,
      targetCount: objective.targetCount,
      completed: currentCount >= objective.targetCount,
    };
  });

  return {
    questId: quest.id,
    completed: objectives.every((objective) => objective.completed),
    objectives,
  };
}