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
  const isAnswered =
    selectedAnswer !== null && selectedAnswer.trim().length > 0;

  const isCorrect =
    isAnswered &&
    selectedAnswer.trim() === correctAnswer.trim();

  return {
    questionId,
    selectedAnswer,
    correctAnswer,
    isCorrect,
    isAnswered,
  };
}