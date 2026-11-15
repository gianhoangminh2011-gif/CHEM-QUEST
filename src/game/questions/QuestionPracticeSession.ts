/**
 * CHEM QUEST — Question Repository / Practice Session adapter
 *
 * Connects stored question IDs to the existing Practice Session Core.
 *
 * This adapter does not:
 * - Define or validate QDA fields.
 * - Determine question eligibility or scientific verification.
 * - Evaluate answers or calculate scores.
 * - Generate questions.
 */

import {
  createPracticeSession,
} from '../practice/PracticeSession';

import type {
  PracticeSession,
  PracticeSessionConfig,
} from '../practice/PracticeTypes';

import type {
  QuestionRepository,
} from './QuestionRepository';

export type QuestionPracticeSessionResult =
  | {
      readonly status: 'created';
      readonly session: PracticeSession;
    }
  | {
      readonly status: 'invalid_config';
    }
  | {
      readonly status: 'question_not_found';
      readonly questionId: string;
    };

export function createPracticeSessionFromRepository<TPayload>(
  repository: QuestionRepository<TPayload>,
  config: PracticeSessionConfig,
): QuestionPracticeSessionResult {
  const session = createPracticeSession(config);

  if (!session) {
    return { status: 'invalid_config' };
  }

  for (const questionId of session.questionIds) {
    if (!repository.has(questionId)) {
      return {
        status: 'question_not_found',
        questionId,
      };
    }
  }

  return {
    status: 'created',
    session,
  };
}