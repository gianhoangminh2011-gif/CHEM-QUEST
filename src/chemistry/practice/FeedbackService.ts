import type { AnswerEvaluation } from "./AnswerEvaluator";

export type AnswerFeedback = {
  status: "correct" | "incorrect" | "unanswered" | "unavailable";
  message: string;
};

export function createFeedback(
  evaluation: AnswerEvaluation | null,
  unavailable = false
): AnswerFeedback {
  if (unavailable || evaluation === null) {
    return {
      status: "unavailable",
      message: "Evaluation is unavailable. This question was not scored.",
    };
  }

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