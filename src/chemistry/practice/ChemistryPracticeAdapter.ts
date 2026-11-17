export function submitChemistryAnswer(
  session: PracticeSession,
  questionId: string,
  selectedAnswer: string | null,
  correctAnswer: string
): ChemistrySubmissionResult {
  if (
    typeof correctAnswer !== "string" ||
    correctAnswer.trim().length === 0
  ) {
    throw new Error("A valid correct answer is required.");
  }

  if (
    selectedAnswer !== null &&
    typeof selectedAnswer !== "string"
  ) {
    throw new Error("Invalid selected answer.");
  }

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