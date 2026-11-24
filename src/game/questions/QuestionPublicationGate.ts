/**
 * W3 Verified Question Publication Gate
 *
 * This module provides a fail-closed boundary between an approved
 * publication source and the Practice UI.
 *
 * It does NOT:
 * - Verify scientific correctness.
 * - Interpret QDA fields or invent publication rules.
 * - Change question status.
 * - Resolve TDRs or OVR.
 * - Publish, approve, or modify questions.
 */

export interface PublishedPracticeQuestion {
  readonly id: string;
  readonly [key: string]: unknown;
}

export type PublicationGateResult =
  | {
      readonly status: 'ready';
      readonly questions: readonly PublishedPracticeQuestion[];
    }
  | {
      readonly status: 'unavailable';
      readonly reason: 'source-missing' | 'source-error' | 'empty-source';
    };

export type PublishedQuestionSource = () =>
  | Promise<readonly PublishedPracticeQuestion[]>
  | readonly PublishedPracticeQuestion[];

export async function loadPublishedPracticeQuestions(
  source?: PublishedQuestionSource,
): Promise<PublicationGateResult> {
  if (!source) {
    return {
      status: 'unavailable',
      reason: 'source-missing',
    };
  }

  let questions: readonly PublishedPracticeQuestion[];

  try {
    questions = await source();
  } catch {
    return {
      status: 'unavailable',
      reason: 'source-error',
    };
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      status: 'unavailable',
      reason: 'empty-source',
    };
  }

  const validQuestions = questions.every(
    (question) =>
      question !== null &&
      typeof question === 'object' &&
      typeof question.id === 'string' &&
      question.id.trim().length > 0,
  );

  if (!validQuestions) {
    return {
      status: 'unavailable',
      reason: 'source-error',
    };
  }

  return {
    status: 'ready',
    questions: [...questions],
  };
}