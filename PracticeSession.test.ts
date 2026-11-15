
import { describe, expect, it } from 'vitest';
import {
  createPracticeSession,
  getCurrentPracticeQuestion,
  getPracticeSessionSummary,
  submitPracticeAnswer,
} from './PracticeSession';

describe('PracticeSession', () => {
  const validConfig = {
    sessionId: 'practice-session-1',
    questionIds: ['question-1', 'question-2', 'question-3'],
  };

  it('creates a session with the first question active', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();

    if (!session) return;

    expect(session.sessionId).toBe('practice-session-1');
    expect(session.questionIds).toEqual([
      'question-1',
      'question-2',
      'question-3',
    ]);
    expect(session.currentQuestionIndex).toBe(0);
    expect(session.status).toBe('active');
    expect(session.submissions).toEqual({});
    expect(getCurrentPracticeQuestion(session)).toBe('question-1');
  });

  it('rejects invalid session configurations', () => {
    const invalidConfigs: unknown[] = [
      null,
      undefined,
      {},
      { sessionId: '', questionIds: ['question-1'] },
      { sessionId: '   ', questionIds: ['question-1'] },
      { sessionId: 'session-1', questionIds: [] },
      { sessionId: 'session-1', questionIds: [''] },
      { sessionId: 'session-1', questionIds: ['question-1', ' '] },
      {
        sessionId: 'session-1',
        questionIds: ['question-1', 'question-1'],
      },
      { sessionId: 'session-1', questionIds: null },
    ];

    for (const config of invalidConfigs) {
      expect(
        createPracticeSession(config as Parameters<
          typeof createPracticeSession
        >[0])
      ).toBeNull();
    }
  });

  it('does not mutate the supplied question ID array', () => {
    const questionIds = ['question-1', 'question-2'];

    const session = createPracticeSession({
      sessionId: 'session-1',
      questionIds,
    });

    expect(session).not.toBeNull();
    expect(questionIds).toEqual(['question-1', 'question-2']);

    if (!session) return;

    expect(session.questionIds).not.toBe(questionIds);
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.questionIds)).toBe(true);
    expect(Object.isFrozen(session.submissions)).toBe(true);
  });

  it('accepts an answer and advances to the next question', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();
    if (!session) return;

    const result = submitPracticeAnswer(
      session,
      'question-1',
      'answer-a'
    );

    expect(result.status).toBe('accepted');
    expect(result.session).not.toBe(session);
    expect(result.session.currentQuestionIndex).toBe(1);
    expect(result.session.status).toBe('active');
    expect(
      getCurrentPracticeQuestion(result.session)
    ).toBe('question-2');
    expect(
      result.session.submissions['question-1']
    ).toEqual({
      questionId: 'question-1',
      answerToken: 'answer-a',
    });

    expect(session.currentQuestionIndex).toBe(0);
    expect(session.submissions).toEqual({});
  });

  it('rejects a duplicate answer submission', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();
    if (!session) return;

    const first = submitPracticeAnswer(
      session,
      'question-1',
      'answer-a'
    );

    expect(first.status).toBe('accepted');

    const duplicate = submitPracticeAnswer(
      first.session,
      'question-1',
      'answer-b'
    );

    expect(duplicate.status).toBe('duplicate');
    expect(duplicate.session).toBe(first.session);
  });

  it('rejects an answer for a question that is not current', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();
    if (!session) return;

    const result = submitPracticeAnswer(
      session,
      'question-2',
      'answer-a'
    );

    expect(result.status).toBe('question_not_current');
    expect(result.session).toBe(session);
    expect(result.session.currentQuestionIndex).toBe(0);
  });

  it('rejects blank question IDs and answer tokens', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();
    if (!session) return;

    const invalidSubmissions = [
      { questionId: '', answerToken: 'answer-a' },
      { questionId: '   ', answerToken: 'answer-a' },
      { questionId: 'question-1', answerToken: '' },
      { questionId: 'question-1', answerToken: '   ' },
    ];

    for (const submission of invalidSubmissions) {
      const result = submitPracticeAnswer(
        session,
        submission.questionId,
        submission.answerToken
      );

      expect(result.status).toBe('invalid_submission');
      expect(result.session).toBe(session);
    }
  });

  it('completes the session after the final answer', () => {
    const session = createPracticeSession({
      sessionId: 'session-final',
      questionIds: ['question-1', 'question-2'],
    });

    expect(session).not.toBeNull();
    if (!session) return;

    const first = submitPracticeAnswer(
      session,
      'question-1',
      'answer-a'
    );

    expect(first.status).toBe('accepted');

    const second = submitPracticeAnswer(
      first.session,
      'question-2',
      'answer-b'
    );

    expect(second.status).toBe('accepted');
    expect(second.session.status).toBe('completed');
    expect(second.session.currentQuestionIndex).toBe(2);
    expect(getCurrentPracticeQuestion(second.session)).toBeNull();

    const afterCompletion = submitPracticeAnswer(
      second.session,
      'question-2',
      'answer-c'
    );

    expect(afterCompletion.status).toBe('session_completed');
    expect(afterCompletion.session).toBe(second.session);
  });

  it('summarizes answered and unanswered questions', () => {
    const session = createPracticeSession(validConfig);

    expect(session).not.toBeNull();
    if (!session) return;

    const first = submitPracticeAnswer(
      session,
      'question-1',
      'answer-a'
    );

    expect(first.status).toBe('accepted');

    const summary = getPracticeSessionSummary(first.session);

    expect(summary).toEqual({
      sessionId: 'practice-session-1',
      totalQuestions: 3,
      answeredQuestions: 1,
      unansweredQuestions: 2,
      completed: false,
    });
  });

  it('summarizes a completed session without scoring answers', () => {
    const session = createPracticeSession({
      sessionId: 'session-complete',
      questionIds: ['question-1', 'question-2'],
    });

    expect(session).not.toBeNull();
    if (!session) return;

    const first = submitPracticeAnswer(
      session,
      'question-1',
      'answer-a'
    );

    const second = submitPracticeAnswer(
      first.session,
      'question-2',
      'answer-b'
    );

    const summary = getPracticeSessionSummary(second.session);

    expect(summary).toEqual({
      sessionId: 'session-complete',
      totalQuestions: 2,
      answeredQuestions: 2,
      unansweredQuestions: 0,
      completed: true,
    });
  });
});
