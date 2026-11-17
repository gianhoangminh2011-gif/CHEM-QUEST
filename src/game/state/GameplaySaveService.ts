
import type { GameplayState } from './GameplayState';
import type {
  AnalysisResult,
  ResearchSample,
} from '../chemistry/ChemistrySystem';

export const GAMEPLAY_SAVE_KEY = 'chem-quest:gameplay-save';
export const GAMEPLAY_SAVE_SCHEMA_VERSION = 1;

interface GameplaySaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  state: GameplayState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  );
}

function isResearchSample(
  value: unknown,
  key: string
): value is ResearchSample {
  if (!isRecord(value)) return false;

  return (
    value.id === key &&
    typeof value.sourceId === 'string' &&
    value.id === `sample:${value.sourceId}` &&
    value.sampleType === 'unidentified-mineral' &&
    typeof value.displayName === 'string'
  );
}

function isAnalysisResult(
  value: unknown,
  key: string
): value is AnalysisResult {
  if (!isRecord(value)) return false;

  return (
    value.sampleId === key &&
    value.resultCode === 'UNIDENTIFIED_MINERAL' &&
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    value.identificationStatus === 'unidentified' &&
    value.isVerified === false &&
    typeof value.disclaimer === 'string'
  );
}

function isGameplayState(value: unknown): value is GameplayState {
  if (!isRecord(value)) return false;

  if (
    !isStringArray(value.discoveredNodeIds) ||
    !isStringArray(value.collectedResourceIds) ||
    !isStringArray(value.craftedEquipmentIds) ||
    !isStringArray(value.completedPracticeIds) ||
    !isStringArray(value.unlockedProgressionIds) ||
    !isRecord(value.researchSamplesById) ||
    !isRecord(value.analysisResultsBySampleId)
  ) {
    return false;
  }

  for (const [key, sample] of Object.entries(value.researchSamplesById)) {
    if (!isResearchSample(sample, key)) return false;
  }

  for (const [key, result] of Object.entries(value.analysisResultsBySampleId)) {
    if (
      !Object.prototype.hasOwnProperty.call(value.researchSamplesById, key) ||
      !isAnalysisResult(result, key)
    ) {
      return false;
    }
  }

  return true;
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;

  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeState(state: GameplayState): GameplayState {
  const samples = Object.create(null) as Record<string, ResearchSample>;
  const results = Object.create(null) as Record<string, AnalysisResult>;

  for (const [key, value] of Object.entries(state.researchSamplesById)) {
    samples[key] = { ...value };
  }

  for (const [key, value] of Object.entries(state.analysisResultsBySampleId)) {
    results[key] = { ...value };
  }

  return {
    discoveredNodeIds: [...state.discoveredNodeIds],
    collectedResourceIds: [...state.collectedResourceIds],
    researchSamplesById: samples,
    analysisResultsBySampleId: results,
    craftedEquipmentIds: [...state.craftedEquipmentIds],
    completedPracticeIds: [...state.completedPracticeIds],
    unlockedProgressionIds: [...state.unlockedProgressionIds],
  };
}

export function saveGameplayState(
  state: GameplayState,
  storage?: Storage
): boolean {
  const target = getStorage(storage);

  if (!target || !isGameplayState(state)) return false;

  const envelope: GameplaySaveEnvelope = {
    schemaVersion: GAMEPLAY_SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    state: normalizeState(state),
  };

  try {
    target.setItem(GAMEPLAY_SAVE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function loadGameplaySave(storage?: Storage): GameplayState | null {
  const target = getStorage(storage);
  if (!target) return null;

  try {
    const raw = target.getItem(GAMEPLAY_SAVE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== GAMEPLAY_SAVE_SCHEMA_VERSION ||
      !isGameplayState(parsed.state)
    ) {
      return null;
    }

    return normalizeState(parsed.state);
  } catch {
    return null;
  }
}

export function clearGameplaySave(storage?: Storage): boolean {
  const target = getStorage(storage);
  if (!target) return false;

  try {
    target.removeItem(GAMEPLAY_SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
