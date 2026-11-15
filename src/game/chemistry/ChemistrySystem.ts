
import type { GameplayState } from '../state/GameplayState';

export const SAMPLE_CONFIG = {
  'unidentified-mineral': {
    displayName: 'Unidentified Mineral Sample',
    resultCode: 'UNIDENTIFIED_MINERAL',
    title: 'Unidentified Sample',
    summary: 'This sample has not been identified.',
    identificationStatus: 'unidentified',
    isVerified: false,
  },
} as const;

export type SampleType = keyof typeof SAMPLE_CONFIG;

export const ANALYSIS_DISCLAIMER =
  'This result is a fictional in-game observation and is not a scientifically verified identification.';

export interface ResearchSample {
  id: string;
  sourceId: string;
  sampleType: SampleType;
  displayName: string;
}

export interface AnalysisResult {
  sampleId: string;
  resultCode: 'UNIDENTIFIED_MINERAL';
  title: string;
  summary: string;
  identificationStatus: 'unidentified';
  isVerified: false;
  disclaimer: string;
}

export type ChemistryError =
  | 'INVALID_SOURCE_ID'
  | 'UNKNOWN_SAMPLE_TYPE'
  | 'INVALID_SAMPLE_ID'
  | 'SAMPLE_NOT_FOUND';

export type ChemistryResult<T> =
  | { ok: true; value: T; duplicate: boolean }
  | { ok: false; error: ChemistryError };

export interface ChemistryTransition<T> {
  state: GameplayState;
  result: ChemistryResult<T>;
}

export interface CollectSampleInput {
  sourceId: unknown;
  sampleType: unknown;
}

export interface ChemistryBridge {
  analyzeSample(
    sampleId: string
  ): ChemistryResult<AnalysisResult> | null;
}

export const CHEMISTRY_BRIDGE_READY_EVENT =
  'chemistry-bridge-ready';

export const CHEMISTRY_BRIDGE_CLEARED_EVENT =
  'chemistry-bridge-cleared';

export const CHEMISTRY_BRIDGE_REGISTRY_KEY =
  'chemistryBridge';

export const CHEMISTRY_ERROR_MESSAGES: Record<
  ChemistryError,
  string
> = {
  INVALID_SOURCE_ID:
    'This sample source is invalid. Please try again.',
  UNKNOWN_SAMPLE_TYPE:
    'This sample type is not supported.',
  INVALID_SAMPLE_ID:
    'This sample ID is invalid.',
  SAMPLE_NOT_FOUND:
    'This sample could not be found. Collect it before analyzing.',
};

function hasOwn(
  object: object,
  key: PropertyKey
): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function createRecordMap<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function cloneRecordMap<T>(
  source: Record<string, T>
): Record<string, T> {
  const next = createRecordMap<T>();

  for (const key of Object.keys(source)) {
    next[key] = source[key];
  }

  return next;
}

function isValidSourceId(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 64 &&
    value.trim() === value &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function isValidSampleId(
  value: unknown
): value is string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('sample:')
  ) {
    return false;
  }

  return isValidSourceId(
    value.slice('sample:'.length)
  );
}

export function collectSample(
  state: GameplayState,
  input: CollectSampleInput
): ChemistryTransition<ResearchSample> {
  if (
    !input ||
    !isValidSourceId(input.sourceId)
  ) {
    return {
      state,
      result: {
        ok: false,
        error: 'INVALID_SOURCE_ID',
      },
    };
  }

  if (
    typeof input.sampleType !== 'string' ||
    !hasOwn(SAMPLE_CONFIG, input.sampleType)
  ) {
    return {
      state,
      result: {
        ok: false,
        error: 'UNKNOWN_SAMPLE_TYPE',
      },
    };
  }

  const sampleType =
    input.sampleType as SampleType;

  const id = `sample:${input.sourceId}`;

  if (hasOwn(state.researchSamplesById, id)) {
    const existing =
      state.researchSamplesById[id];

    if (!existing || existing.id !== id) {
      return {
        state,
        result: {
          ok: false,
          error: 'INVALID_SAMPLE_ID',
        },
      };
    }

    return {
      state,
      result: {
        ok: true,
        value: existing,
        duplicate: true,
      },
    };
  }

  const sample: ResearchSample = {
    id,
    sourceId: input.sourceId,
    sampleType,
    displayName:
      SAMPLE_CONFIG[sampleType].displayName,
  };

  const researchSamplesById =
    cloneRecordMap(state.researchSamplesById);

  researchSamplesById[id] = sample;

  return {
    state: {
      ...state,
      researchSamplesById,
    },
    result: {
      ok: true,
      value: sample,
      duplicate: false,
    },
  };
}

export function analyzeSample(
  state: GameplayState,
  sampleId: string
): ChemistryTransition<AnalysisResult> {
  if (!isValidSampleId(sampleId)) {
    return {
      state,
      result: {
        ok: false,
        error: 'INVALID_SAMPLE_ID',
      },
    };
  }

  if (!hasOwn(state.researchSamplesById, sampleId)) {
    return {
      state,
      result: {
        ok: false,
        error: 'SAMPLE_NOT_FOUND',
      },
    };
  }

  const sample =
    state.researchSamplesById[sampleId];

  if (!sample || sample.id !== sampleId) {
    return {
      state,
      result: {
        ok: false,
        error: 'INVALID_SAMPLE_ID',
      },
    };
  }

  if (hasOwn(state.analysisResultsBySampleId, sampleId)) {
    const existing =
      state.analysisResultsBySampleId[sampleId];

    if (
      existing &&
      existing.sampleId === sampleId
    ) {
      return {
        state,
        result: {
          ok: true,
          value: existing,
          duplicate: true,
        },
      };
    }
  }

  const config = SAMPLE_CONFIG[sample.sampleType];

  const result: AnalysisResult = {
    sampleId,
    resultCode: config.resultCode,
    title: config.title,
    summary: config.summary,
    identificationStatus:
      config.identificationStatus,
    isVerified: config.isVerified,
    disclaimer: ANALYSIS_DISCLAIMER,
  };

  const analysisResultsBySampleId =
    cloneRecordMap(state.analysisResultsBySampleId);

  analysisResultsBySampleId[sampleId] = result;

  return {
    state: {
      ...state,
      analysisResultsBySampleId,
    },
    result: {
      ok: true,
      value: result,
      duplicate: false,
    },
  };
}

export function isAnalysed(
  state: GameplayState,
  sampleId: string
): boolean {
  if (
    !hasOwn(state.analysisResultsBySampleId, sampleId) ||
    !hasOwn(state.researchSamplesById, sampleId)
  ) {
    return false;
  }

  const result =
    state.analysisResultsBySampleId[sampleId];

  const sample =
    state.researchSamplesById[sampleId];

  return Boolean(
    result &&
    sample &&
    result.sampleId === sampleId &&
    sample.id === sampleId
  );
}

export function countValidAnalysisResults(
  state: GameplayState
): number {
  return Object.keys(
    state.analysisResultsBySampleId
  ).filter((key) => {
    if (!hasOwn(state.researchSamplesById, key)) {
      return false;
    }

    const result =
      state.analysisResultsBySampleId[key];

    const sample =
      state.researchSamplesById[key];

    return Boolean(
      result &&
      sample &&
      result.sampleId === key &&
      sample.id === key
    );
  }).length;
}

export function getCollectionWrapWidth(
  bannerWidth: number,
  horizontalInset: number
): number {
  return Math.min(
    960,
    Math.max(0, bannerWidth - horizontalInset)
  );
}
