
import { describe, expect, it } from 'vitest';

import {
  createPracticeSession,
  getCurrentPracticeQuestion,
  getPracticeSessionSummary,
  submitPracticeAnswer,
} from './PracticeSession';

import type { PracticeSessionConfig } from './PracticeTypes';

describe('PracticeSession', () => {
  const validConfig: PracticeSessionConfig = {
    sessionId: 'session-001',
    questionIds: ['question-001', 'question-002'],
  };

  it('creates a new active session', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();
    expect(session?.status).toBe('active');
    expect(session?.currentQuestionIndex).toBe(0);
    expect(session?.submissions).toEqual({});
    expect(getCurrentPracticeQuestion(session!)).toBe('question-001');
  });

  it('rejects an invalid session configuration', () => {
    expect(
      createPracticeSession({
        sessionId: '',
        questionIds: ['question-001'],
      }),
    ).toBeNull();

    expect(
      createPracticeSession({
        sessionId: 'session-001',
        questionIds: [],
      }),
    ).toBeNull();

    expect(
      createPracticeSession({
        sessionId: 'session-001',
        questionIds: ['question-001', ''],
      }),
    ).toBeNull();

    expect(
      createPracticeSession({
        sessionId: 'session-001',
        questionIds: ['question-001', 'question-001'],
      }),
    ).toBeNull();
  });

  it('does not mutate the supplied question ID array', () => {
    const questionIds = ['question-001', 'question-002'];

    createPracticeSession({
      sessionId: 'session-001',
      questionIds,
    });

    expect(questionIds).toEqual(['question-001', 'question-002']);
  });

  it('creates an immutable session', () => {
    const session = createPracticeSession(validConfig);

    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session?.questionIds)).toBe(true);
    expect(Object.isFrozen(session?.submissions)).toBe(true);
  });

  it('accepts an answer and advances to the next question', () => {
    const session = createPracticeSession(validConfig)!;

    const result = submitPracticeAnswer(
      session,
      'question-001',
      'option-a',
    );

    expect(result.status).toBe('accepted');
    expect(result.session.currentQuestionIndex).toBe(1);
    expect(result.session.status).toBe('active');
    expect(getCurrentPracticeQuestion(result.session)).toBe('question-002');
    expect(result.session.submissions['question-001']).toEqual({
      questionId: 'question-001',
      answerToken: 'option-a',
    });
  });

  it('rejects duplicate submissions', () => {
    const session = createPracticeSession(validConfig)!;

    const first = submitPracticeAnswer(
      session,
      'question-001',
      'option-a',
    );

    const second = submitPracticeAnswer(
      first.session,
      'question-001',
      'option-b',
    );

    expect(first.status).toBe('accepted');
    expect(second.status).toBe('duplicate');
    expect(second.session).toBe(first.session);
  });

  it('rejects an answer for a question that is not current', () => {
    const session = createPracticeSession(validConfig)!;

    const result = submitPracticeAnswer(
      session,
      'question-002',
      'option-a',
    );

    expect(result.status).toBe('question_not_current');
    expect(result.session).toBe(session);
  });

  it('rejects blank question IDs and answer tokens', () => {
    const session = createPracticeSession(validConfig)!;

    expect(
      submitPracticeAnswer(session, '', 'option-a').status,
    ).toBe('invalid_submission');

    expect(
      submitPracticeAnswer(session, 'question-001', ' ').status,
    ).toBe('invalid_submission');
  });

  it('completes the session after the final answer', () => {
    const session = createPracticeSession(validConfig)!;

    const first = submitPracticeAnswer(
      session,
      'question-001',
      'option-a',
    );

    const second = submitPracticeAnswer(
      first.session,
      'question-002',
      'option-b',
    );

    expect(second.status).toBe('accepted');
    expect(second.session.status).toBe('completed');
    expect(getCurrentPracticeQuestion(second.session)).toBeNull();
  });

  it('rejects submissions after session completion', () => {
    const session = createPracticeSession(validConfig)!;

    const first = submitPracticeAnswer(
      session,
      'question-001',
      'option-a',
    );

    const second = submitPracticeAnswer(
      first.session,
      'question-002',
      'option-b',
    );

    const third = submitPracticeAnswer(
      second.session,
      'question-002',
      'option-c',
    );

    expect(third.status).toBe('session_completed');
    expect(third.session).toBe(second.session);
  });

  it('summarizes a partially completed session without scoring', () => {
    const session = createPracticeSession(validConfig)!;

    const result = submitPracticeAnswer(
      session,
      'question-001',
      'option-a',
    );

    expect(getPracticeSessionSummary(result.session)).toEqual({
      sessionId: 'session-001',
      totalQuestions: 2,
      answeredQuestions: 1,
      unansweredQuestions: 1,
      completed: false,
    });
  });

  it('summarizes a completed session without scoring', () => {
    const session = createPracticeSession(validConfig)!;

    const first = submitPracticeAnswer(
      session,
      'question-001',
      'option-a',
    );

    const second = submitPracticeAnswer(
      first.session,
      'question-002',
      'option-b',
    );

    expect(getPracticeSessionSummary(second.session)).toEqual({
      sessionId: 'session-001',
      totalQuestions: 2,
      answeredQuestions: 2,
      unansweredQuestions: 0,
      completed: true,
    });
  });
});
