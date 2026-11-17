export type AnswerEvaluation = {
  questionId: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isAnswered: boolean;
};

export function evaluateAnswer(
  questionId: string,
  selectedAnswer: string | null,
  correctAnswer: string
): AnswerEvaluation {
  if (typeof questionId !== "string" || questionId.trim().length === 0) {
    throw new Error("Question ID is required.");
  }

  if (selectedAnswer !== null && typeof selectedAnswer !== "string") {
    throw new Error("Invalid selected answer.");
  }

  if (
    typeof correctAnswer !== "string" ||
    correctAnswer.trim().length === 0
  ) {
    throw new Error("A valid correct answer is required.");
  }

  const isAnswered =
    selectedAnswer !== null && selectedAnswer.trim().length > 0;

  const isCorrect =
    isAnswered && selectedAnswer.trim() === correctAnswer.trim();

  return {
    questionId,
    selectedAnswer,
    correctAnswer,
    isCorrect,
    isAnswered,
  };
}