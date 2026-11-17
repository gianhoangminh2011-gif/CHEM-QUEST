

import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "./AnswerEvaluator";

describe("evaluateAnswer", () => {
  it("identifies a correct answer", () => {
    expect(evaluateAnswer("Q-001", "A", "A")).toEqual({
      questionId: "Q-001",
      selectedAnswer: "A",
      correctAnswer: "A",
      isCorrect: true,
      isAnswered: true,
    });
  });

  it("identifies an incorrect answer", () => {
    const result = evaluateAnswer("Q-001", "B", "A");
    expect(result.isCorrect).toBe(false);
    expect(result.isAnswered).toBe(true);
  });

  it("identifies an unanswered question", () => {
    const result = evaluateAnswer("Q-001", null, "A");
    expect(result.isCorrect).toBe(false);
    expect(result.isAnswered).toBe(false);
  });

  it("identifies a blank answer as unanswered", () => {
    const result = evaluateAnswer("Q-001", "   ", "A");
    expect(result.isCorrect).toBe(false);
    expect(result.isAnswered).toBe(false);
  });

  it("ignores surrounding whitespace when comparing answers", () => {
    const result = evaluateAnswer("Q-001", " A ", "A");
    expect(result.isCorrect).toBe(true);
  });

  it("rejects an empty question ID", () => {
    expect(() => evaluateAnswer("", "A", "A")).toThrow(
      "Question ID is required."
    );
  });

  it("rejects a whitespace-only question ID", () => {
    expect(() => evaluateAnswer("   ", "A", "A")).toThrow(
      "Question ID is required."
    );
  });

  it("rejects a non-string selected answer", () => {
    expect(() =>
      evaluateAnswer("Q-001", 123 as unknown as string, "A")
    ).toThrow("Invalid selected answer.");
  });

  it("rejects an undefined selected answer", () => {
    expect(() =>
      evaluateAnswer("Q-001", undefined as unknown as string, "A")
    ).toThrow("Invalid selected answer.");
  });

  it("rejects a blank correct answer", () => {
    expect(() => evaluateAnswer("Q-001", "A", "   ")).toThrow(
      "A valid correct answer is required."
    );
  });

  it("rejects a non-string correct answer", () => {
    expect(() =>
      evaluateAnswer("Q-001", "A", 123 as unknown as string)
    ).toThrow("A valid correct answer is required.");
  });
});
