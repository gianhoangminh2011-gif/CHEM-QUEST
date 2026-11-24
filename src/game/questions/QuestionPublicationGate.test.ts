
import { describe, expect, it, vi } from 'vitest';

import {
  approveAnswerKey,
  createAnswerKeyIntake,
  submitAnswerKeyForReview,
  verifyAnswerKey,
} from '../../chemistry/answer-keys/AnswerKeyIntake';

import {
  loadPublishedPracticeQuestions,
} from './QuestionPublicationGate';

import type {
  PublishedPracticeQuestion,
} from '../PracticePanel';

interface AnswerKeyOptions {
  readonly complete?: boolean;
  readonly sourceType?: string;
  readonly locator?: string;
}

function makeAnswerKey(
  questionId: string,
  options: AnswerKeyOptions = {},
) {
  const submitted = createAnswerKeyIntake({
    answerKeyId: `AK-${questionId}`,
    questionId,
    questionVersion: 'v1',
    questionSnapshotFingerprint: `fingerprint-${questionId}`,
    correctChoiceId: 'A',
    sources: [
      {
        sourceId: `SOURCE-${questionId}`,
        sourceType:
          options.sourceType ?? 'curriculum_reference',
        locator:
          options.locator ??
          `https://example.test/references/${questionId}`,
        capturedAt: '2026-01-01T07:00:00.000Z',
        contentFingerprint: `source-fingerprint-${questionId}`,
      },
    ],
    submittedBy: `author-${questionId}`,
    submittedAt: '2026-01-01T08:00:00.000Z',
    version: 1,
  });

  if (options.complete === false) {
    return submitted;
  }

  const inReview = submitAnswerKeyForReview(submitted);

  const verified = verifyAnswerKey(
    inReview,
    `reviewer-${questionId}`,
    '2026-01-01T09:00:00.000Z',
    'verified',
    `VERIFY-${questionId}`,
  );

  return approveAnswerKey(
    verified,
    `approver-${questionId}`,
    '2026-01-01T10:00:00.000Z',
    `APPROVE-${questionId}`,
  );
}

function makeQuestion(
  questionId: string,
  options: AnswerKeyOptions = {},
): PublishedPracticeQuestion {
  return {
    presentation: {
      questionId,
      prompt: `Question prompt for ${questionId}?`,
      choices: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
    },
    snapshot: {
      questionId,
      questionVersion: 'v1',
      fingerprint: `fingerprint-${questionId}`,
      choiceIds: ['A', 'B'],
    },
    answerKey: makeAnswerKey(questionId, options),
  };
}

describe('loadPublishedPracticeQuestions', () => {
  it('fails closed when the publication source is missing', async () => {
    const result = await loadPublishedPracticeQuestions();

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'source-missing',
    });
  });

  it('fails closed when the publication source throws', async () => {
    const source = vi.fn().mockRejectedValue(
      new Error('Publication source unavailable'),
    );

    const result = await loadPublishedPracticeQuestions(source);

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'source-error',
    });
  });

  it('fails closed when the publication source is empty', async () => {
    const result = await loadPublishedPracticeQuestions(() => []);

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'empty-source',
    });
  });

  it('fails closed when the source does not return an array', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => null as unknown as readonly unknown[],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('returns questions with structurally valid approved answer keys', async () => {
    const questions = [
      makeQuestion('question-001'),
      makeQuestion('question-002'),
    ];

    const result = await loadPublishedPracticeQuestions(
      () => questions,
    );

    expect(result).toEqual({
      status: 'ready',
      questions,
    });
  });

  it('rejects null records', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => [null],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects records with missing publication fields', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => [{
        presentation: {},
        snapshot: {},
        answerKey: {},
      }],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects blank question IDs', async () => {
    const question = makeQuestion('question-blank');

    const invalidQuestion = {
      ...question,
      presentation: {
        ...question.presentation,
        questionId: '   ',
      },
    };

    const result = await loadPublishedPracticeQuestions(
      () => [invalidQuestion],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects mismatched presentation and snapshot IDs', async () => {
    const question = makeQuestion('question-001');

    const invalidQuestion = {
      ...question,
      snapshot: {
        ...question.snapshot,
        questionId: 'question-002',
      },
    };

    const result = await loadPublishedPracticeQuestions(
      () => [invalidQuestion],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects records with an empty prompt', async () => {
    const question = makeQuestion('question-001');

    const invalidQuestion = {
      ...question,
      presentation: {
        ...question.presentation,
        prompt: '   ',
      },
    };

    const result = await loadPublishedPracticeQuestions(
      () => [invalidQuestion],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects mismatched presentation and snapshot choices', async () => {
    const question = makeQuestion('question-001');

    const invalidQuestion = {
      ...question,
      snapshot: {
        ...question.snapshot,
        choiceIds: ['A', 'C'],
      },
    };

    const result = await loadPublishedPracticeQuestions(
      () => [invalidQuestion],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects answer keys without source records', async () => {
    const question = makeQuestion('question-001');

    const invalidQuestion = {
      ...question,
      answerKey: {
        ...question.answerKey,
        sources: [],
      },
    };

    const result = await loadPublishedPracticeQuestions(
      () => [invalidQuestion],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects answer keys that are not complete and verified', async () => {
    const question = makeQuestion(
      'question-draft',
      { complete: false },
    );

    const result = await loadPublishedPracticeQuestions(
      () => [question],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects synthetic test-fixture answer keys', async () => {
    const question = makeQuestion(
      'question-fixture',
      {
        sourceType: 'test_fixture',
        locator: 'synthetic://test-fixture/question-fixture',
      },
    );

    const result = await loadPublishedPracticeQuestions(
      () => [question],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects answer keys belonging to another question', async () => {
    const question = makeQuestion('question-001');

    const invalidQuestion = {
      ...question,
      answerKey: {
        ...question.answerKey,
        questionId: 'question-002',
      },
    };

    const result = await loadPublishedPracticeQuestions(
      () => [invalidQuestion],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects duplicate question IDs', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => [
        makeQuestion('question-001'),
        makeQuestion('question-001'),
      ],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });
});
