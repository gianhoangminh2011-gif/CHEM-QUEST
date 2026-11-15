
import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_DISCLAIMER,
  analyzeSample,
  collectSample,
  countValidAnalysisResults,
  getCollectionWrapWidth,
  isAnalysed,
} from './ChemistrySystem';
import { createGameplayState } from '../state/GameplayState';

describe('ChemistrySystem', () => {
  it('collects a valid unidentified mineral sample', () => {
    const state = createGameplayState();

    const transition = collectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(transition.result.ok).toBe(true);
    expect(transition.state).not.toBe(state);

    expect(
      transition.state.researchSamplesById[
        'sample:outcrop-350-315'
      ]
    ).toEqual({
      id: 'sample:outcrop-350-315',
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
      displayName: 'Unidentified Mineral Sample',
    });
  });

  it('rejects invalid source IDs', () => {
    const state = createGameplayState();

    const invalidValues: unknown[] = [
      '',
      ' ',
      ' outcrop-350-315',
      'outcrop-350-315 ',
      'OUTCROP-350-315',
      'outcrop_350_315',
      'a'.repeat(65),
      null,
      123,
    ];

    for (const sourceId of invalidValues) {
      const transition = collectSample(state, {
        sourceId,
        sampleType: 'unidentified-mineral',
      });

      expect(transition.result).toEqual({
        ok: false,
        error: 'INVALID_SOURCE_ID',
      });

      expect(transition.state).toBe(state);
    }
  });

  it('rejects unsupported sample types', () => {
    const state = createGameplayState();

    const transition = collectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unknown-type',
    });

    expect(transition.result).toEqual({
      ok: false,
      error: 'UNKNOWN_SAMPLE_TYPE',
    });

    expect(transition.state).toBe(state);
  });

  it('returns the existing sample when collection is duplicated', () => {
    const state = createGameplayState();

    const first = collectSample(state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(first.result.ok).toBe(true);

    const second = collectSample(first.state, {
      sourceId: 'outcrop-350-315',
      sampleType: 'unidentified-mineral',
    });

    expect(second.result.ok).toBe(true);

    if (second.result.ok) {
      expect(second.result.duplicate).toBe(true);
    }

    expect(second.state).toBe(first.state);
  });

  it('does not analyze a sample before collection', () => {
    const state = createGameplayState();

    const transition = analyzeSample(
      state,
      'sample:outcrop-350-315'
    );

    expect(transition.result).toEqual({
      ok: false,
      error: 'SAMPLE_NOT_FOUND',
    });

    expect(transition.state).toBe(state);
  });

  it('rejects malformed and reserved sample IDs', () => {
    const state = createGameplayState();

    const invalidIds = [
      '',
      'constructor',
      'sample:',
      'sample:__proto__',
      'sample:toString',
      'sample:Invalid-ID',
      'sample:invalid_id',
      'sample: invalid',
    ];

    for (const sampleId of invalidIds) {
      const transition = analyzeSample(state, sampleId);

      expect(transition.result).toEqual({
        ok: false,
        error: 'INVALID_SAMPLE_ID',
      });

      expect(transition.state).toBe(state);
    }
  });

  it('treats sample:constructor as a valid ID that has not been collected', () => {
    const state = createGameplayState();

    const transition = analyzeSample(
      state,
      'sample:constructor'
    );

    expect(transition.result).toEqual({
      ok: false,
      error: 'SAMPLE_NOT_FOUND',
    });
  });

  it('creates a fictional, unverified analysis result', () => {
    const collected = collectSample(
      createGameplayState(),
      {
        sourceId: 'outcrop-350-315',
        sampleType: 'unidentified-mineral',
      }
    );

    expect(collected.result.ok).toBe(true);

    const transition = analyzeSample(
      collected.state,
      'sample:outcrop-350-315'
    );

    expect(transition.result.ok).toBe(true);

    if (transition.result.ok) {
      expect(transition.result.value).toEqual({
        sampleId: 'sample:outcrop-350-315',
        resultCode: 'UNIDENTIFIED_MINERAL',
        title: 'Unidentified Sample',
        summary: 'This sample has not been identified.',
        identificationStatus: 'unidentified',
        isVerified: false,
        disclaimer: ANALYSIS_DISCLAIMER,
      });
    }
  });

  it('returns the existing result when analysis is repeated', () => {
    const collected = collectSample(
      createGameplayState(),
      {
        sourceId: 'outcrop-350-315',
        sampleType: 'unidentified-mineral',
      }
    );

    const first = analyzeSample(
      collected.state,
      'sample:outcrop-350-315'
    );

    expect(first.result.ok).toBe(true);

    const second = analyzeSample(
      first.state,
      'sample:outcrop-350-315'
    );

    expect(second.result.ok).toBe(true);

    if (second.result.ok) {
      expect(second.result.duplicate).toBe(true);
    }

    expect(second.state).toBe(first.state);
  });

  it('counts only valid analysis results linked to collected samples', () => {
    const collected = collectSample(
      createGameplayState(),
      {
        sourceId: 'outcrop-350-315',
        sampleType: 'unidentified-mineral',
      }
    );

    const analyzed = analyzeSample(
      collected.state,
      'sample:outcrop-350-315'
    );

    expect(countValidAnalysisResults(collected.state)).toBe(0);
    expect(countValidAnalysisResults(analyzed.state)).toBe(1);

    expect(
      isAnalysed(
        analyzed.state,
        'sample:outcrop-350-315'
      )
    ).toBe(true);

    expect(
      isAnalysed(
        analyzed.state,
        'sample:missing'
      )
    ).toBe(false);
  });

  it('does not count an orphaned analysis result', () => {
    const state = createGameplayState();

    const invalidState = {
      ...state,
      analysisResultsBySampleId: {
        'sample:missing': {
          sampleId: 'sample:missing',
          resultCode: 'UNIDENTIFIED_MINERAL' as const,
          title: 'Unidentified Sample',
          summary: 'This sample has not been identified.',
          identificationStatus: 'unidentified' as const,
          isVerified: false as const,
          disclaimer: ANALYSIS_DISCLAIMER,
        },
      },
    };

    expect(countValidAnalysisResults(invalidState)).toBe(0);
    expect(isAnalysed(invalidState, 'sample:missing')).toBe(false);
  });

  it('calculates a safe collection feedback width', () => {
    expect(getCollectionWrapWidth(1200, 100)).toBe(960);
    expect(getCollectionWrapWidth(700, 100)).toBe(600);
    expect(getCollectionWrapWidth(50, 100)).toBe(0);
  });
});
