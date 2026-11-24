import { describe, expect, it } from "vitest";
import { createSessionSummary } from "./SessionSummary";
import type { AnswerEvaluation } from "./AnswerEvaluator";

const correct: AnswerEvaluation = {
  questionId: "Q-001",
  selectedAnswer: "A",
  isCorrect: true,
  isAnswered: true,
  answerKeyId: "AK-001",
  answerKeyVersion: 1,
};

const incorrect: AnswerEvaluation = {
  questionId: "Q-002",
  selectedAnswer: "B",
  isCorrect: false,
  isAnswered: true,
  answerKeyId: "AK-002",
  answerKeyVersion: 1,
};

const unanswered: AnswerEvaluation = {
  questionId: "Q-003",
  selectedAnswer: null,
  isCorrect: false,
  isAnswered: false,
  answerKeyId: "AK-003",
  answerKeyVersion: 1,
};

describe("SessionSummary", () => {
  it("counts all four evaluation outcomes", () => {
    expect(
      createSessionSummary([
        correct,
        incorrect,
        unanswered,
        null,
      ])
    ).toEqual({
      totalQuestions: 4,
      correctAnswers: 1,
      incorrectAnswers: 1,
      unansweredQuestions: 1,
      evaluationUnavailable: 1,
    });
  });

  it("returns zero counts for an empty session", () => {
    expect(createSessionSummary([])).toEqual({
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unansweredQuestions: 0,
      evaluationUnavailable: 0,
    });
  });
});