
/**
 * CHEM QUEST — Practice Session Core
 *
 * This module defines session-level types only.
 * It does not define the Question Data Architecture (QDA),
 * question content schema, or question eligibility rules.
 */

/**
 * Opaque runtime identifier for a question.
 * This is not a definition of the QDA Question ID field.
 */
export type PracticeQuestionId = string;

/**
 * Opaque runtime identifier for a practice session.
 */
export type PracticeSessionId = string;

/**
 * Opaque answer token supplied by the presentation layer.
 * Its meaning is determined by the future question implementation.
 */
export type PracticeAnswerToken = string;

export type PracticeSessionStatus = 'active' | 'completed';

export interface PracticeSessionConfig {
  sessionId: PracticeSessionId;
  questionIds: readonly PracticeQuestionId[];
}

export interface PracticeAnswerSubmission {
  questionId: PracticeQuestionId;
  answerToken: PracticeAnswerToken;
}

export interface PracticeSession {
  readonly sessionId: PracticeSessionId;
  readonly questionIds: readonly PracticeQuestionId[];
  readonly currentQuestionIndex: number;
  readonly submissions: Readonly<
    Record<PracticeQuestionId, PracticeAnswerSubmission>
  >;
  readonly status: PracticeSessionStatus;
}

export type PracticeSubmissionStatus =
  | 'accepted'
  | 'duplicate'
  | 'question_not_current'
  | 'session_completed'
  | 'invalid_submission';

export interface PracticeSubmissionResult {
  status: PracticeSubmissionStatus;
  session: PracticeSession;
}

export interface PracticeSessionSummary {
  sessionId: PracticeSessionId;
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  completed: boolean;
}
