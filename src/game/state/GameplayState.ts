
import {
  analyzeSample,
  collectSample,
  type AnalysisResult,
  type CollectSampleInput,
  type ResearchSample,
  type SampleType,
  type ChemistryTransition,
} from '../chemistry/ChemistrySystem';

export type GameplayStage =
  | 'explore'
  | 'collect'
  | 'research'
  | 'craft'
  | 'practice'
  | 'progress';

export interface GameplayState {
  discoveredNodeIds: string[];
  collectedResourceIds: string[];
  researchSamplesById: Record<string, ResearchSample>;
  analysisResultsBySampleId: Record<string, AnalysisResult>;
  craftedEquipmentIds: string[];
  completedPracticeIds: string[];
  unlockedProgressionIds: string[];
}

export type GameplayAction =
  | { type: 'DISCOVER_NODE'; id: string }
  | { type: 'COLLECT_RESOURCE'; id: string }
  | {
      type: 'COLLECT_SAMPLE';
      sourceId: string;
      sampleType: SampleType;
    }
  | { type: 'ANALYZE_SAMPLE'; sampleId: string }
  | { type: 'CRAFT_EQUIPMENT'; id: string }
  | { type: 'COMPLETE_PRACTICE'; id: string }
  | { type: 'UNLOCK_PROGRESSION'; id: string };

function createEmptyIds(): string[] {
  return [];
}

function createEmptyRecordMap<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

export const initialGameplayState: GameplayState = Object.freeze({
  discoveredNodeIds: Object.freeze([]) as unknown as string[],
  collectedResourceIds: Object.freeze([]) as unknown as string[],
  researchSamplesById: Object.freeze(
    createEmptyRecordMap<ResearchSample>()
  ),
  analysisResultsBySampleId: Object.freeze(
    createEmptyRecordMap<AnalysisResult>()
  ),
  craftedEquipmentIds: Object.freeze([]) as unknown as string[],
  completedPracticeIds: Object.freeze([]) as unknown as string[],
  unlockedProgressionIds: Object.freeze([]) as unknown as string[],
}) as GameplayState;

const listeners = new Set<(state: GameplayState) => void>();

export function createGameplayState(): GameplayState {
  return {
    discoveredNodeIds: createEmptyIds(),
    collectedResourceIds: createEmptyIds(),
    researchSamplesById: createEmptyRecordMap<ResearchSample>(),
    analysisResultsBySampleId:
      createEmptyRecordMap<AnalysisResult>(),
    craftedEquipmentIds: createEmptyIds(),
    completedPracticeIds: createEmptyIds(),
    unlockedProgressionIds: createEmptyIds(),
  };
}

function notifyGameplayState(state: GameplayState): void {
  listeners.forEach((listener) => listener(state));
}

export function subscribeGameplayState(
  listener: (state: GameplayState) => void
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function resetGameplayState(): GameplayState {
  const nextState = createGameplayState();
  notifyGameplayState(nextState);
  return nextState;
}

function addUniqueId(ids: string[], id: string): string[] {
  const normalizedId = id.trim();

  if (!normalizedId || ids.includes(normalizedId)) {
    return ids;
  }

  return [...ids, normalizedId];
}

export function applyCollectSample(
  state: GameplayState,
  input: CollectSampleInput
): ChemistryTransition<ResearchSample> {
  const transition = collectSample(state, input);

  if (transition.state !== state) {
    notifyGameplayState(transition.state);
  }

  return transition;
}

export function applyAnalyzeSample(
  state: GameplayState,
  sampleId: string
): ChemistryTransition<AnalysisResult> {
  const transition = analyzeSample(state, sampleId);

  if (transition.state !== state) {
    notifyGameplayState(transition.state);
  }

  return transition;
}

export function updateGameplayState(
  state: GameplayState,
  action: GameplayAction
): GameplayState {
  let nextState: GameplayState;

  switch (action.type) {
    case 'DISCOVER_NODE': {
      const ids = addUniqueId(state.discoveredNodeIds, action.id);
      if (ids === state.discoveredNodeIds) return state;
      nextState = { ...state, discoveredNodeIds: ids };
      break;
    }

    case 'COLLECT_RESOURCE': {
      const ids = addUniqueId(state.collectedResourceIds, action.id);
      if (ids === state.collectedResourceIds) return state;
      nextState = { ...state, collectedResourceIds: ids };
      break;
    }

    case 'COLLECT_SAMPLE': {
      const transition = collectSample(state, {
        sourceId: action.sourceId,
        sampleType: action.sampleType,
      });

      if (transition.state === state) return state;

      nextState = transition.state;
      break;
    }

    case 'ANALYZE_SAMPLE': {
      const transition = analyzeSample(state, action.sampleId);

      if (transition.state === state) return state;

      nextState = transition.state;
      break;
    }

    case 'CRAFT_EQUIPMENT': {
      const ids = addUniqueId(state.craftedEquipmentIds, action.id);
      if (ids === state.craftedEquipmentIds) return state;
      nextState = { ...state, craftedEquipmentIds: ids };
      break;
    }

    case 'COMPLETE_PRACTICE': {
      const ids = addUniqueId(state.completedPracticeIds, action.id);
      if (ids === state.completedPracticeIds) return state;
      nextState = { ...state, completedPracticeIds: ids };
      break;
    }

    case 'UNLOCK_PROGRESSION': {
      const ids = addUniqueId(state.unlockedProgressionIds, action.id);
      if (ids === state.unlockedProgressionIds) return state;
      nextState = { ...state, unlockedProgressionIds: ids };
      break;
    }

    default:
      return state;
  }

  notifyGameplayState(nextState);
  return nextState;
}
