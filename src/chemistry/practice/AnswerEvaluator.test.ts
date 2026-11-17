import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "./AnswerEvaluator";

describe("AnswerEvaluator", () => {
  it("identifies a correct answer", () => {
    const result = evaluateAnswer("Q-001", "A", "A");

    expect(result.isAnswered).toBe(true);
    expect(result.isCorrect).toBe(true);
  });

  it("identifies an incorrect answer", () => {
    const result = evaluateAnswer("Q-001", "B", "A");

    expect(result.isAnswered).toBe(true);
    expect(result.isCorrect).toBe(false);
  });

  it("identifies an unanswered question", () => {
    const result = evaluateAnswer("Q-001", null, "A");

    expect(result.isAnswered).toBe(false);
    expect(result.isCorrect).toBe(false);
  });

  it("treats blank answers as unanswered", () => {
    const result = evaluateAnswer("Q-001", "   ", "A");

    expect(result.isAnswered).toBe(false);
    expect(result.isCorrect).toBe(false);
  });

  it("ignores surrounding whitespace when comparing answers", () => {
    const result = evaluateAnswer("Q-001", " A ", "A");

    expect(result.isCorrect).toBe(true);
  });
});