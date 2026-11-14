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
  analyzedSampleIds: string[];
  craftedEquipmentIds: string[];
  completedPracticeIds: string[];
  unlockedProgressionIds: string[];
}

export type GameplayAction =
  | { type: 'DISCOVER_NODE'; id: string }
  | { type: 'COLLECT_RESOURCE'; id: string }
  | { type: 'ANALYZE_SAMPLE'; id: string }
  | { type: 'CRAFT_EQUIPMENT'; id: string }
  | { type: 'COMPLETE_PRACTICE'; id: string }
  | { type: 'UNLOCK_PROGRESSION'; id: string };

export const initialGameplayState: GameplayState = {
  discoveredNodeIds: [],
  collectedResourceIds: [],
  analyzedSampleIds: [],
  craftedEquipmentIds: [],
  completedPracticeIds: [],
  unlockedProgressionIds: [],
};

const listeners = new Set<(state: GameplayState) => void>();

export function createGameplayState(): GameplayState {
  return {
    discoveredNodeIds: [],
    collectedResourceIds: [],
    analyzedSampleIds: [],
    craftedEquipmentIds: [],
    completedPracticeIds: [],
    unlockedProgressionIds: [],
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

    case 'ANALYZE_SAMPLE': {
      const ids = addUniqueId(state.analyzedSampleIds, action.id);
      if (ids === state.analyzedSampleIds) return state;
      nextState = { ...state, analyzedSampleIds: ids };
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