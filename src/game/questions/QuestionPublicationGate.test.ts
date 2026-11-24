import { describe, expect, it, vi } from 'vitest';

import {
  loadPublishedPracticeQuestions,
  type PublishedPracticeQuestion,
} from './QuestionPublicationGate';

function makeQuestion(
  id: string,
): PublishedPracticeQuestion {
  return {
    presentation: {
      questionId: id,
    },
    snapshot: {
      questionId: id,
    },
    answerKey: {},
  } as unknown as PublishedPracticeQuestion;
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

  it('returns questions when all records are valid', async () => {
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
      () => [{ presentation: {}, snapshot: {} }],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects blank question IDs', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => [makeQuestion('   ')],
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'invalid-record',
    });
  });

  it('rejects mismatched presentation and snapshot IDs', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => [{
        presentation: { questionId: 'question-001' },
        snapshot: { questionId: 'question-002' },
        answerKey: {},
      }],
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