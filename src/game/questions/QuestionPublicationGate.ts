
/**
 * W3 Verified Question Publication Gate
 *
 * Fail-closed structural boundary between an approved publication
 * source and the Practice UI.
 *
 * This module does NOT:
 * - Verify scientific correctness or curriculum alignment.
 * - Establish the authority or authenticity of a publication source.
 * - Interpret unresolved QDA fields or invent publication rules.
 * - Change question status or approve/publish questions.
 * - Resolve TDRs or OVR.
 *
 * It validates the runtime shape required by PracticePanel and
 * reuses the existing AnswerKeyRegistry eligibility contract.
 */

import type {
  PublishedPracticeQuestion,
} from '../PracticePanel';

import {
  resolveAnswerKey,
} from '../../chemistry/answer-keys/AnswerKeyRegistry';

import type {
  ChemistryQuestionSnapshot,
} from '../../chemistry/answer-keys/AnswerKeyRegistry';

import type {
  AnswerKeyIntakeRecord,
} from '../../chemistry/answer-keys/AnswerKeyIntake';

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

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}

/**
 * Returns a question ID only when the record is structurally
 * compatible with PracticePanel and has one eligible answer key.
 *
 * Answer-key eligibility is not equivalent to QDA scientific
 * verification or production publication authorization.
 */
function getUsableQuestionId(
  value: unknown,
): string | null {
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
    !isNonEmptyString(presentationId) ||
    !isNonEmptyString(snapshotId) ||
    presentationId !== presentationId.trim() ||
    snapshotId !== snapshotId.trim() ||
    presentationId !== snapshotId
  ) {
    return null;
  }

  if (!isNonEmptyString(presentation.prompt)) {
    return null;
  }

  if (
    !isNonEmptyString(snapshot.questionVersion) ||
    !isNonEmptyString(snapshot.fingerprint)
  ) {
    return null;
  }

  const presentationChoices = presentation.choices;

  if (
    !Array.isArray(presentationChoices) ||
    presentationChoices.length < 2
  ) {
    return null;
  }

  const presentationChoiceIds: string[] = [];
  const seenPresentationChoiceIds = new Set<string>();

  for (const choice of presentationChoices) {
    if (!isRecord(choice)) {
      return null;
    }

    const choiceId = choice.id;
    const choiceText = choice.text;

    if (
      !isNonEmptyString(choiceId) ||
      choiceId !== choiceId.trim() ||
      !isNonEmptyString(choiceText)
    ) {
      return null;
    }

    if (seenPresentationChoiceIds.has(choiceId)) {
      return null;
    }

    seenPresentationChoiceIds.add(choiceId);
    presentationChoiceIds.push(choiceId);
  }

  const snapshotChoiceIds = snapshot.choiceIds;

  if (
    !Array.isArray(snapshotChoiceIds) ||
    snapshotChoiceIds.length !== presentationChoiceIds.length
  ) {
    return null;
  }

  const normalizedSnapshotChoiceIds: string[] = [];
  const seenSnapshotChoiceIds = new Set<string>();

  for (const choiceId of snapshotChoiceIds) {
    if (
      !isNonEmptyString(choiceId) ||
      choiceId !== choiceId.trim() ||
      seenSnapshotChoiceIds.has(choiceId)
    ) {
      return null;
    }

    seenSnapshotChoiceIds.add(choiceId);
    normalizedSnapshotChoiceIds.push(choiceId);
  }

  if (
    !presentationChoiceIds.every(
      (choiceId) => seenSnapshotChoiceIds.has(choiceId),
    )
  ) {
    return null;
  }

  const answerKeySources = answerKey.sources;

  if (
    !Array.isArray(answerKeySources) ||
    answerKeySources.length === 0
  ) {
    return null;
  }

  for (const source of answerKeySources) {
    if (
      !isRecord(source) ||
      !isNonEmptyString(source.sourceId) ||
      !isNonEmptyString(source.sourceType) ||
      !isNonEmptyString(source.locator) ||
      !isNonEmptyString(source.capturedAt) ||
      !isNonEmptyString(source.contentFingerprint)
    ) {
      return null;
    }

    // Test fixtures must never enter the production Practice UI.
    if (
      source.sourceType === 'test_fixture' ||
      source.locator.startsWith('synthetic://')
    ) {
      return null;
    }
  }

  const answerKeyResolution = resolveAnswerKey(
    [answerKey as unknown as AnswerKeyIntakeRecord],
    snapshot as unknown as ChemistryQuestionSnapshot,
  );

  if (answerKeyResolution.status !== 'eligible') {
    return null;
  }

  return presentationId;
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
    let questionId: string | null;

    try {
      questionId = getUsableQuestionId(record);
    } catch {
      return {
        status: 'unavailable',
        reason: 'invalid-record',
      };
    }

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
