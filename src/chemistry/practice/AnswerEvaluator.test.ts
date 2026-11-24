import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "./AnswerEvaluator";
import { createApprovedTestAnswerKey } from "../answer-keys/AnswerKeyTestFactory";
import type { ChemistryQuestionSnapshot } from "../answer-keys/AnswerKeyRegistry";

const question: ChemistryQuestionSnapshot = {
  questionId: "Q-001",
  questionVersion: "v1",
  fingerprint: "fingerprint-001",
  choiceIds: ["A", "B", "C", "D"],
};

describe("evaluateAnswer", () => {
  const key = createApprovedTestAnswerKey();

  it("evaluates a correct choice using an approved key", () => {
    expect(evaluateAnswer(question, "A", key)).toEqual({
      questionId: "Q-001",
      selectedAnswer: "A",
      isCorrect: true,
      isAnswered: true,
      answerKeyId: "AK-Q-001",
      answerKeyVersion: 1,
    });
  });

  it("evaluates an incorrect choice", () => {
    const result = evaluateAnswer(question, "B", key);

    expect(result.isCorrect).toBe(false);
    expect(result.isAnswered).toBe(true);
  });

  it("classifies null as unanswered", () => {
    const result = evaluateAnswer(question, null, key);

    expect(result.isCorrect).toBe(false);
    expect(result.isAnswered).toBe(false);
  });

  it("classifies blank selection as unanswered", () => {
    const result = evaluateAnswer(question, "   ", key);

    expect(result.isCorrect).toBe(false);
    expect(result.isAnswered).toBe(false);
  });

  it("rejects a key for a different question snapshot", () => {
    expect(() =>
      evaluateAnswer(
        { ...question, fingerprint: "different-fingerprint" },
        "A",
        key
      )
    ).toThrow("Answer key does not match the question snapshot.");
  });

  it("rejects a choice ID that does not exist in the snapshot", () => {
    const invalidKey = createApprovedTestAnswerKey(
      "Q-001",
      "Z"
    );

    expect(() =>
      evaluateAnswer(question, "A", invalidKey)
    ).toThrow("Answer key choice does not exist in the question.");
  });

  it("rejects an unapproved key", () => {
    const pendingKey = {
      ...key,
      approvalStatus: "pending" as const,
    };

    expect(() =>
      evaluateAnswer(question, "A", pendingKey)
    ).toThrow("Answer key is not eligible for evaluation.");
  });

  it("rejects a non-string selected answer", () => {
    expect(() =>
      evaluateAnswer(
        question,
        123 as unknown as string,
        key
      )
    ).toThrow("Invalid selected answer.");
  });
});