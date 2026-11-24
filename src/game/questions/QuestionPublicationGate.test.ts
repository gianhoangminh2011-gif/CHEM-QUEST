import { describe, expect, it, vi } from 'vitest';

import {
  loadPublishedPracticeQuestions,
  type PublishedPracticeQuestion,
} from './QuestionPublicationGate';

const sampleQuestions: readonly PublishedPracticeQuestion[] = [
  {
    id: 'question-001',
    prompt: 'Sample question',
  },
];

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

  it('returns questions when the source provides valid records', async () => {
    const result = await loadPublishedPracticeQuestions(
      () => sampleQuestions,
    );

    expect(result.status).toBe('ready');

    if (result.status === 'ready') {
      expect(result.questions).toEqual(sampleQuestions);
    }
  });

  it('rejects records without a valid question ID', async () => {
    const source = () =>
      [{ id: '   ' }] as unknown as readonly PublishedPracticeQuestion[];

    const result = await loadPublishedPracticeQuestions(source);

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'source-error',
    });
  });
});