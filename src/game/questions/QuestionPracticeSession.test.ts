import { describe, expect, it } from 'vitest';

import {
  createQuestionRepository,
} from './QuestionRepository';

import {
  createPracticeSessionFromRepository,
} from './QuestionPracticeSession';

describe('QuestionPracticeSession adapter', () => {
  it('creates a session when every question exists', () => {
    const repository = createQuestionRepository<unknown>();

    repository.add('Q-001', { prompt: 'Question 1' });
    repository.add('Q-002', { prompt: 'Question 2' });

    const result = createPracticeSessionFromRepository(
      repository,
      {
        sessionId: 'SESSION-001',
        questionIds: ['Q-001', 'Q-002'],
      },
    );

    expect(result.status).toBe('created');

    if (result.status === 'created') {
      expect(result.session.questionIds).toEqual([
        'Q-001',
        'Q-002',
      ]);

      expect(result.session.status).toBe('active');
      expect(result.session.currentQuestionIndex).toBe(0);
    }
  });

  it('rejects a session when a question is missing', () => {
    const repository = createQuestionRepository<unknown>();

    repository.add('Q-001', { prompt: 'Question 1' });

    const result = createPracticeSessionFromRepository(
      repository,
      {
        sessionId: 'SESSION-002',
        questionIds: ['Q-001', 'Q-999'],
      },
    );

    expect(result).toEqual({
      status: 'question_not_found',
      questionId: 'Q-999',
    });
  });

  it('does not create a session with invalid configuration', () => {
    const repository = createQuestionRepository<unknown>();

    const result = createPracticeSessionFromRepository(
      repository,
      {
        sessionId: 'SESSION-003',
        questionIds: [],
      },
    );

    expect(result).toEqual({
      status: 'invalid_config',
    });
  });

  it('rejects duplicate question IDs', () => {
    const repository = createQuestionRepository<unknown>();

    repository.add('Q-001', { prompt: 'Question 1' });

    const result = createPracticeSessionFromRepository(
      repository,
      {
        sessionId: 'SESSION-004',
        questionIds: ['Q-001', 'Q-001'],
      },
    );

    expect(result).toEqual({
      status: 'invalid_config',
    });
  });

  it('does not create a session when the repository is empty', () => {
    const repository = createQuestionRepository<unknown>();

    const result = createPracticeSessionFromRepository(
      repository,
      {
        sessionId: 'SESSION-005',
        questionIds: ['Q-001'],
      },
    );

    expect(result).toEqual({
      status: 'question_not_found',
      questionId: 'Q-001',
    });
  });
});