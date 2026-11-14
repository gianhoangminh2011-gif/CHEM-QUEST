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