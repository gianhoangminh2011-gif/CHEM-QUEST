
/**
 * CHEM QUEST — Practice Session Core
 *
 * Manages the lifecycle of a practice session.
 *
 * This module deliberately does not define:
 * - Question Data Architecture (QDA)
 * - Question content or eligibility rules
 * - Correct-answer evaluation
 * - Mastery, XP, rewards, or progression
 */

import type {
  PracticeAnswerSubmission,
  PracticeAnswerToken,
  PracticeQuestionId,
  PracticeSession,
  PracticeSessionConfig,
  PracticeSessionId,
  PracticeSessionSummary,
  PracticeSubmissionResult,
} from './PracticeTypes';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function createSubmissionRecord(): Record<
  PracticeQuestionId,
  PracticeAnswerSubmission
> {
  return Object.create(null) as Record<
    PracticeQuestionId,
    PracticeAnswerSubmission
  >;
}

/**
 * Creates a new practice session.
 *
 * Returns null when the supplied configuration is invalid:
 * - Missing or blank session ID
 * - Missing or empty question ID list
 * - Blank question IDs
 * - Duplicate question IDs
 */
export function createPracticeSession(
  config: PracticeSessionConfig
): PracticeSession | null {
  if (!config || !isNonEmptyString(config.sessionId)) {
    return null;
  }

  if (!Array.isArray(config.questionIds) || config.questionIds.length === 0) {
    return null;
  }

  const questionIds = [...config.questionIds];

  if (!questionIds.every(isNonEmptyString)) {
    return null;
  }

  if (new Set(questionIds).size !== questionIds.length) {
    return null;
  }

  return Object.freeze({
    sessionId: config.sessionId,
    questionIds: Object.freeze(questionIds),
    currentQuestionIndex: 0,
    submissions: Object.freeze(createSubmissionRecord()),
    status: 'active',
  });
}

/**
 * Returns the current question ID.
 * Returns null when the session is completed or invalid.
 */
export function getCurrentPracticeQuestion(
  session: PracticeSession
): PracticeQuestionId | null {
  if (!session || session.status !== 'active') {
    return null;
  }

  return session.questionIds[session.currentQuestionIndex] ?? null;
}

/**
 * Submits an opaque answer token for the current question.
 *
 * An accepted submission advances the session by one question.
 * This function does not evaluate whether the answer is correct.
 */
export function submitPracticeAnswer(
  session: PracticeSession,
  questionId: PracticeQuestionId,
  answerToken: PracticeAnswerToken
): PracticeSubmissionResult {
  const rejected = (
    status: PracticeSubmissionResult['status']
  ): PracticeSubmissionResult => ({
    status,
    session,
  });

  if (!session || !Array.isArray(session.questionIds)) {
    return rejected('invalid_submission');
  }

  if (session.status === 'completed') {
    return rejected('session_completed');
  }

  if (
    !isNonEmptyString(questionId) ||
    !isNonEmptyString(answerToken)
  ) {
    return rejected('invalid_submission');
  }

  if (Object.prototype.hasOwnProperty.call(session.submissions, questionId)) {
    return rejected('duplicate');
  }

  const currentQuestionId = getCurrentPracticeQuestion(session);

  if (currentQuestionId === null || questionId !== currentQuestionId) {
    return rejected('question_not_current');
  }

  const submission: PracticeAnswerSubmission = Object.freeze({
    questionId,
    answerToken,
  });

  const nextSubmissions = Object.assign(
    createSubmissionRecord(),
    session.submissions
  );

  nextSubmissions[questionId] = submission;

  const nextQuestionIndex = session.currentQuestionIndex + 1;
  const isCompleted = nextQuestionIndex >= session.questionIds.length;

  const nextSession: PracticeSession = Object.freeze({
    ...session,
    currentQuestionIndex: nextQuestionIndex,
    submissions: Object.freeze(nextSubmissions),
    status: isCompleted ? 'completed' : 'active',
  });

  return {
    status: 'accepted',
    session: nextSession,
  };
}

/**
 * Produces a session-level summary.
 *
 * The summary counts submitted answers only.
 * It does not calculate correctness or scores.
 */
export function getPracticeSessionSummary(
  session: PracticeSession
): PracticeSessionSummary {
  const totalQuestions = session.questionIds.length;
  const answeredQuestions = Object.keys(session.submissions).length;

  return {
    sessionId: session.sessionId,
    totalQuestions,
    answeredQuestions,
    unansweredQuestions: totalQuestions - answeredQuestions,
    completed: session.status === 'completed',
  };
}
