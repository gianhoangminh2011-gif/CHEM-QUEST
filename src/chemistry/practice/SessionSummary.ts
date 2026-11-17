import type { AnswerEvaluation } from "./AnswerEvaluator";

export type PracticeSessionSummary = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
};

export function createSessionSummary(
  evaluations: AnswerEvaluation[]
): PracticeSessionSummary {
  const correctAnswers = evaluations.filter(
    (item) => item.isAnswered && item.isCorrect
  ).length;

  const incorrectAnswers = evaluations.filter(
    (item) => item.isAnswered && !item.isCorrect
  ).length;

  const unansweredQuestions = evaluations.filter(
    (item) => !item.isAnswered
  ).length;

  return {
    totalQuestions: evaluations.length,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
  };
}