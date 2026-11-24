
import type { GameplayState } from '../state/GameplayState';
import { isAnalysed } from '../chemistry/ChemistrySystem';

export type QuestObjectiveType =
  | 'DISCOVER_NODE'
  | 'COLLECT_RESOURCE'
  | 'COLLECT_SAMPLE'
  | 'ANALYZE_SAMPLE';

export interface QuestObjective {
  id: string;
  description: string;
  type: QuestObjectiveType;
  targetIds: string[];
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
      targetIds: [
        'crystal-540-210',
        'crystal-760-335',
        'crystal-225-310',
      ],
      targetCount: 3,
    },
    {
      id: 'collect-mineral',
      description: 'Mineral samples collected',
      type: 'COLLECT_SAMPLE',
      targetIds: ['sample:outcrop-350-315'],
      targetCount: 1,
    },
    {
      id: 'analyze-mineral',
      description: 'Mineral samples analyzed',
      type: 'ANALYZE_SAMPLE',
      targetIds: ['sample:outcrop-350-315'],
      targetCount: 1,
    },
  ],
};

function getDiscoveredNodeIds(
  state: GameplayState
): string[] {
  return state.discoveredNodeIds;
}

function getCollectedResourceIds(
  state: GameplayState
): string[] {
  return state.collectedResourceIds;
}

function getCollectedSampleIds(
  state: GameplayState
): string[] {
  return Object.values(state.researchSamplesById)
    .filter((sample) => Boolean(sample && sample.id))
    .map((sample) => sample.id);
}

function getAnalyzedSampleIds(
  state: GameplayState
): string[] {
  return Object.keys(state.analysisResultsBySampleId)
    .filter((sampleId) => isAnalysed(state, sampleId));
}

function getEventIds(
  state: GameplayState,
  type: QuestObjectiveType
): string[] {
  switch (type) {
    case 'DISCOVER_NODE':
      return getDiscoveredNodeIds(state);

    case 'COLLECT_RESOURCE':
      return getCollectedResourceIds(state);

    case 'COLLECT_SAMPLE':
      return getCollectedSampleIds(state);

    case 'ANALYZE_SAMPLE':
      return getAnalyzedSampleIds(state);

    default:
      return [];
  }
}

function getObjectiveCount(
  objective: QuestObjective,
  state: GameplayState
): number {
  if (
    !Array.isArray(objective.targetIds) ||
    !Number.isInteger(objective.targetCount) ||
    objective.targetCount < 1
  ) {
    return 0;
  }

  const uniqueTargets = new Set(
    objective.targetIds.filter(
      (id) => typeof id === 'string' && id.trim().length > 0
    )
  );

  const occurredIds = new Set(
    getEventIds(state, objective.type)
  );

  let matchedCount = 0;

  for (const targetId of uniqueTargets) {
    if (occurredIds.has(targetId)) {
      matchedCount += 1;
    }
  }

  return Math.min(matchedCount, objective.targetCount);
}

export function getQuestProgress(
  quest: QuestDefinition,
  state: GameplayState
): QuestProgress {
  const objectives = quest.objectives.map((objective) => {
    const currentCount = getObjectiveCount(objective, state);

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
    completed:
      objectives.length > 0 &&
      objectives.every((objective) => objective.completed),
    objectives,
  };
}
