import type { AnswerEvaluation } from "./AnswerEvaluator";

export type AnswerFeedback = {
  status: "correct" | "incorrect" | "unanswered";
  message: string;
};

export function createFeedback(
  evaluation: AnswerEvaluation
): AnswerFeedback {
  if (!evaluation.isAnswered) {
    return {
      status: "unanswered",
      message: "You have not answered this question.",
    };
  }

  if (evaluation.isCorrect) {
    return {
      status: "correct",
      message: "Correct answer!",
    };
  }

  return {
    status: "incorrect",
    message: "Incorrect answer. Try again next time.",
  };
}