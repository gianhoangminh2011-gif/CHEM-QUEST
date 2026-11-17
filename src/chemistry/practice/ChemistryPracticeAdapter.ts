import {
  submitPracticeAnswer,
} from "../../game/practice/PracticeSession";

import type {
  PracticeSession,
  PracticeSubmissionStatus,
} from "../../game/practice/PracticeTypes";

import {
  evaluateAnswer,
} from "./AnswerEvaluator";

import type {
  AnswerEvaluation,
} from "./AnswerEvaluator";

import {
  createFeedback,
} from "./FeedbackService";

import type {
  AnswerFeedback,
} from "./FeedbackService";

import {
  createSessionSummary,
} from "./SessionSummary";

import type {
  PracticeSessionSummary as ChemistrySessionSummary,
} from "./SessionSummary";

const UNANSWERED_TOKEN = "chemistry:unanswered";

function encodeAnswer(answer: string | null): string {
  if (answer === null || answer.trim().length === 0) {
    return UNANSWERED_TOKEN;
  }

  return `chemistry:answered:${encodeURIComponent(answer.trim())}`;
}

function decodeAnswer(token: string): string | null {
  if (token === UNANSWERED_TOKEN) {
    return null;
  }

  const prefix = "chemistry:answered:";

  if (!token.startsWith(prefix)) {
    throw new Error("Invalid chemistry answer token.");
  }

  return decodeURIComponent(token.slice(prefix.length));
}

export type ChemistrySubmissionResult = {
  status: PracticeSubmissionStatus;
  session: PracticeSession;
  evaluation: AnswerEvaluation | null;
  feedback: AnswerFeedback | null;
};

export function submitChemistryAnswer(
  session: PracticeSession,
  questionId: string,
  selectedAnswer: string | null,
  correctAnswer: string
): ChemistrySubmissionResult {
  const result = submitPracticeAnswer(
    session,
    questionId,
    encodeAnswer(selectedAnswer)
  );

  if (result.status !== "accepted") {
    return {
      status: result.status,
      session: result.session,
      evaluation: null,
      feedback: null,
    };
  }

  const evaluation = evaluateAnswer(
    questionId,
    selectedAnswer,
    correctAnswer
  );

  return {
    status: result.status,
    session: result.session,
    evaluation,
    feedback: createFeedback(evaluation),
  };
}

export function getChemistrySessionSummary(
  session: PracticeSession,
  correctAnswers: Readonly<Record<string, string>>
): ChemistrySessionSummary {
  const evaluations = session.questionIds.map((questionId) => {
    if (!Object.prototype.hasOwnProperty.call(correctAnswers, questionId)) {
      throw new Error(`Missing correct answer for ${questionId}.`);
    }

    const submission = session.submissions[questionId];

    const selectedAnswer = submission
      ? decodeAnswer(submission.answerToken)
      : null;

    return evaluateAnswer(
      questionId,
      selectedAnswer,
      correctAnswers[questionId]
    );
  });

  return createSessionSummary(evaluations);
}