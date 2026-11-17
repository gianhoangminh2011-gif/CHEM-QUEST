import { describe, expect, it } from "vitest";
import { createSessionSummary } from "./SessionSummary";
import type { AnswerEvaluation } from "./AnswerEvaluator";

describe("SessionSummary", () => {
  it("counts correct, incorrect, and unanswered questions", () => {
    const evaluations: AnswerEvaluation[] = [
      {
        questionId: "Q-001",
        selectedAnswer: "A",
        correctAnswer: "A",
        isCorrect: true,
        isAnswered: true,
      },
      {
        questionId: "Q-002",
        selectedAnswer: "B",
        correctAnswer: "A",
        isCorrect: false,
        isAnswered: true,
      },
      {
        questionId: "Q-003",
        selectedAnswer: null,
        correctAnswer: "C",
        isCorrect: false,
        isAnswered: false,
      },
    ];

    expect(createSessionSummary(evaluations)).toEqual({
      totalQuestions: 3,
      correctAnswers: 1,
      incorrectAnswers: 1,
      unansweredQuestions: 1,
    });
  });

  it("returns zero counts for an empty session", () => {
    expect(createSessionSummary([])).toEqual({
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unansweredQuestions: 0,
    });
  });
});