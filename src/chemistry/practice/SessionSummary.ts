import type { AnswerEvaluation } from "./AnswerEvaluator";

export type PracticeSessionSummary = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  evaluationUnavailable: number;
};

export function createSessionSummary(
  evaluations: readonly (AnswerEvaluation | null)[]
): PracticeSessionSummary {
  const evaluationUnavailable = evaluations.filter(
    (item) => item === null
  ).length;

  const available = evaluations.filter(
    (item): item is AnswerEvaluation => item !== null
  );

  const correctAnswers = available.filter(
    (item) => item.isAnswered && item.isCorrect
  ).length;

  const incorrectAnswers = available.filter(
    (item) => item.isAnswered && !item.isCorrect
  ).length;

  const unansweredQuestions = available.filter(
    (item) => !item.isAnswered
  ).length;

  const summary = {
    totalQuestions: evaluations.length,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
    evaluationUnavailable,
  };

  if (
    summary.totalQuestions !==
    summary.correctAnswers +
      summary.incorrectAnswers +
      summary.unansweredQuestions +
      summary.evaluationUnavailable
  ) {
    throw new Error("Session summary invariant violated.");
  }

  return summary;
}