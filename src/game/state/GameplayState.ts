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

export function subscribeGameplayState(
  listener: (state: GameplayState) => void
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function addUniqueId(ids: string[], id: string): string[] {
  if (!id.trim() || ids.includes(id)) {
    return ids;
  }

  return [...ids, id];
}

export function updateGameplayState(
  state: GameplayState,
  action: GameplayAction
): GameplayState {
  let nextState: GameplayState;

  switch (action.type) {
    case 'DISCOVER_NODE':
      nextState = {
        ...state,
        discoveredNodeIds: addUniqueId(
          state.discoveredNodeIds,
          action.id
        ),
      };
      break;

    case 'COLLECT_RESOURCE':
      nextState = {
        ...state,
        collectedResourceIds: addUniqueId(
          state.collectedResourceIds,
          action.id
        ),
      };
      break;

    case 'ANALYZE_SAMPLE':
      nextState = {
        ...state,
        analyzedSampleIds: addUniqueId(
          state.analyzedSampleIds,
          action.id
        ),
      };
      break;

    case 'CRAFT_EQUIPMENT':
      nextState = {
        ...state,
        craftedEquipmentIds: addUniqueId(
          state.craftedEquipmentIds,
          action.id
        ),
      };
      break;

    case 'COMPLETE_PRACTICE':
      nextState = {
        ...state,
        completedPracticeIds: addUniqueId(
          state.completedPracticeIds,
          action.id
        ),
      };
      break;

    case 'UNLOCK_PROGRESSION':
      nextState = {
        ...state,
        unlockedProgressionIds: addUniqueId(
          state.unlockedProgressionIds,
          action.id
        ),
      };
      break;

    default:
      return state;
  }

  listeners.forEach((listener) => listener(nextState));

  return nextState;
}