import type {
  AnswerKeyIntakeRecord,
} from "../answer-keys/AnswerKeyIntake";

import {
  resolvePinnedAnswerKey,
} from "../answer-keys/AnswerKeyRegistry";

import type {
  ChemistryQuestionSnapshot,
} from "../answer-keys/AnswerKeyRegistry";

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
    !answerKey ||
    typeof answerKey.answerKeyId !== "string" ||
    !Number.isInteger(answerKey.version) ||
    answerKey.version <= 0
  ) {
    throw new Error("Invalid answer key.");
  }

  const resolution = resolvePinnedAnswerKey(
    [answerKey],
    question,
    answerKey.answerKeyId,
    answerKey.version
  );

  if (resolution.status !== "eligible") {
    throw new Error("Answer key is not eligible for evaluation.");
  }

  const eligibleKey = resolution.record;

  const isAnswered =
    selectedAnswer !== null &&
    selectedAnswer.trim().length > 0;

  return {
    questionId: question.questionId,
    selectedAnswer,
    isCorrect:
      isAnswered &&
      selectedAnswer.trim() === eligibleKey.correctChoiceId,
    isAnswered,
    answerKeyId: eligibleKey.answerKeyId,
    answerKeyVersion: eligibleKey.version,
  };
}