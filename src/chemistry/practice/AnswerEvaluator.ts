import type { AnswerKeyIntakeRecord } from "../answer-keys/AnswerKeyIntake";
import type { ChemistryQuestionSnapshot } from "../answer-keys/AnswerKeyRegistry";

export type AnswerEvaluation = {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  isAnswered: boolean;
  answerKeyId: string;
  answerKeyVersion: number;
};

export function evaluateAnswer(
  question: ChemistryQuestionSnapshot,
  selectedAnswer: string | null,
  answerKey: AnswerKeyIntakeRecord
): AnswerEvaluation {
  if (
    !question ||
    typeof question.questionId !== "string" ||
    question.questionId.trim().length === 0
  ) {
    throw new Error("Question ID is required.");
  }

  if (
    selectedAnswer !== null &&
    typeof selectedAnswer !== "string"
  ) {
    throw new Error("Invalid selected answer.");
  }

  if (
    answerKey.recordStatus !== "complete" ||
    answerKey.verificationStatus !== "verified" ||
    answerKey.approvalStatus !== "approved"
  ) {
    throw new Error("Answer key is not eligible for evaluation.");
  }

  if (
    answerKey.questionId !== question.questionId ||
    answerKey.questionVersion !== question.questionVersion ||
    answerKey.questionSnapshotFingerprint !== question.fingerprint
  ) {
    throw new Error("Answer key does not match the question snapshot.");
  }

  if (
    typeof answerKey.correctChoiceId !== "string" ||
    !question.choiceIds.includes(answerKey.correctChoiceId)
  ) {
    throw new Error("Answer key choice does not exist in the question.");
  }

  const isAnswered =
    selectedAnswer !== null &&
    selectedAnswer.trim().length > 0;

  return {
    questionId: question.questionId,
    selectedAnswer,
    isCorrect:
      isAnswered &&
      selectedAnswer.trim() === answerKey.correctChoiceId,
    isAnswered,
    answerKeyId: answerKey.answerKeyId,
    answerKeyVersion: answerKey.version,
  };
}