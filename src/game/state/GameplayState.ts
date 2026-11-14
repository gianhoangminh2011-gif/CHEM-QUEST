
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
  switch (action.type) {
    case 'DISCOVER_NODE':
      return {
        ...state,
        discoveredNodeIds: addUniqueId(
          state.discoveredNodeIds,
          action.id
        ),
      };

    case 'COLLECT_RESOURCE':
      return {
        ...state,
        collectedResourceIds: addUniqueId(
          state.collectedResourceIds,
          action.id
        ),
      };

    case 'ANALYZE_SAMPLE':
      return {
        ...state,
        analyzedSampleIds: addUniqueId(
          state.analyzedSampleIds,
          action.id
        ),
      };

    case 'CRAFT_EQUIPMENT':
      return {
        ...state,
        craftedEquipmentIds: addUniqueId(
          state.craftedEquipmentIds,
          action.id
        ),
      };

    case 'COMPLETE_PRACTICE':
      return {
        ...state,
        completedPracticeIds: addUniqueId(
          state.completedPracticeIds,
          action.id
        ),
      };

    case 'UNLOCK_PROGRESSION':
      return {
        ...state,
        unlockedProgressionIds: addUniqueId(
          state.unlockedProgressionIds,
          action.id
        ),
      };

    default:
      return state;
  }
}
