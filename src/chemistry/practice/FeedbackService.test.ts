import { describe, expect, it } from "vitest";
import { createFeedback } from "./FeedbackService";
import type { AnswerEvaluation } from "./AnswerEvaluator";

const correctEvaluation: AnswerEvaluation = {
  questionId: "Q-001",
  selectedAnswer: "A",
  isCorrect: true,
  isAnswered: true,
  answerKeyId: "AK-001",
  answerKeyVersion: 1,
};

describe("FeedbackService", () => {
  it("returns correct feedback", () => {
    expect(createFeedback(correctEvaluation).status).toBe("correct");
  });

  it("returns incorrect feedback", () => {
    expect(
      createFeedback({
        ...correctEvaluation,
        selectedAnswer: "B",
        isCorrect: false,
      }).status
    ).toBe("incorrect");
  });

  it("returns unanswered feedback", () => {
    expect(
      createFeedback({
        ...correctEvaluation,
        selectedAnswer: null,
        isCorrect: false,
        isAnswered: false,
      }).status
    ).toBe("unanswered");
  });

  it("returns unavailable feedback without scoring", () => {
    expect(createFeedback(null, true)).toEqual({
      status: "unavailable",
      message: "Evaluation is unavailable. This question was not scored.",
    });
  });
});