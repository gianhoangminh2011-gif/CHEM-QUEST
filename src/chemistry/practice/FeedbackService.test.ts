import { describe, expect, it } from "vitest";
import { createFeedback } from "./FeedbackService";

describe("FeedbackService", () => {
  it("returns correct feedback", () => {
    expect(createFeedback({
      questionId: "Q-001",
      selectedAnswer: "A",
      correctAnswer: "A",
      isCorrect: true,
      isAnswered: true,
    }).status).toBe("correct");
  });

  it("returns incorrect feedback", () => {
    expect(createFeedback({
      questionId: "Q-001",
      selectedAnswer: "B",
      correctAnswer: "A",
      isCorrect: false,
      isAnswered: true,
    }).status).toBe("incorrect");
  });

  it("returns unanswered feedback", () => {
    expect(createFeedback({
      questionId: "Q-001",
      selectedAnswer: null,
      correctAnswer: "A",
      isCorrect: false,
      isAnswered: false,
    }).status).toBe("unanswered");
  });
});