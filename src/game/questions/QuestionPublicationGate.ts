/**
 * W3 Verified Question Publication Gate
 *
 * Fail-closed boundary between an approved publication source
 * and the Practice UI.
 *
 * This module does NOT:
 * - Verify scientific correctness.
 * - Interpret QDA fields or invent publication rules.
 * - Change question status.
 * - Resolve TDRs or OVR.
 * - Approve, publish, or modify questions.
 */

import type {
  PublishedPracticeQuestion as PracticePanelPublishedPracticeQuestion,
} from '../PracticePanel';

export type PublishedPracticeQuestion =
  PracticePanelPublishedPracticeQuestion;

export type PublicationGateResult =
  | {
      readonly status: 'ready';
      readonly questions: readonly PublishedPracticeQuestion[];
    }
  | {
      readonly status: 'unavailable';
      readonly reason:
        | 'source-missing'
        | 'source-error'
        | 'empty-source'
        | 'invalid-record';
    };

export type PublishedQuestionSource = () =>
  | Promise<readonly unknown[]>
  | readonly unknown[];

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function getQuestionId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const presentation = value.presentation;
  const snapshot = value.snapshot;
  const answerKey = value.answerKey;

  if (
    !isRecord(presentation) ||
    !isRecord(snapshot) ||
    !isRecord(answerKey)
  ) {
    return null;
  }

  const presentationId = presentation.questionId;
  const snapshotId = snapshot.questionId;

  if (
    typeof presentationId !== 'string' ||
    typeof snapshotId !== 'string'
  ) {
    return null;
  }

  const normalizedPresentationId = presentationId.trim();
  const normalizedSnapshotId = snapshotId.trim();

  if (
    normalizedPresentationId.length === 0 ||
    normalizedSnapshotId.length === 0 ||
    normalizedPresentationId !== normalizedSnapshotId
  ) {
    return null;
  }

  return normalizedPresentationId;
}

export async function loadPublishedPracticeQuestions(
  source?: PublishedQuestionSource,
): Promise<PublicationGateResult> {
  if (!source) {
    return {
      status: 'unavailable',
      reason: 'source-missing',
    };
  }

  let records: readonly unknown[];

  try {
    const result: unknown = await source();

    if (!Array.isArray(result)) {
      return {
        status: 'unavailable',
        reason: 'invalid-record',
      };
    }

    records = result;
  } catch {
    return {
      status: 'unavailable',
      reason: 'source-error',
    };
  }

  if (records.length === 0) {
    return {
      status: 'unavailable',
      reason: 'empty-source',
    };
  }

  const seenIds = new Set<string>();
  const questions: PublishedPracticeQuestion[] = [];

  for (const record of records) {
    const questionId = getQuestionId(record);

    if (!questionId || seenIds.has(questionId)) {
      return {
        status: 'unavailable',
        reason: 'invalid-record',
      };
    }

    seenIds.add(questionId);
    questions.push(record as PublishedPracticeQuestion);
  }

  return {
    status: 'ready',
    questions,
  };
}