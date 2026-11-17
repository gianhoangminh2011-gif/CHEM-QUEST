import { describe, expect, it } from "vitest";
import { createQuestionPresentation } from "./QuestionPresentation";

describe("QuestionPresentation", () => {
  it("creates a valid question presentation", () => {
    expect(
      createQuestionPresentation("Q-001", "What is water?", [
        { id: "A", text: "H2O" },
        { id: "B", text: "CO2" },
      ])
    ).toEqual({
      questionId: "Q-001",
      prompt: "What is water?",
      choices: [
        { id: "A", text: "H2O" },
        { id: "B", text: "CO2" },
      ],
    });
  });

  it("rejects a blank question ID", () => {
    expect(() =>
      createQuestionPresentation("", "What is water?", [
        { id: "A", text: "H2O" },
        { id: "B", text: "CO2" },
      ])
    ).toThrow("Question ID is required.");
  });

  it("rejects a blank question prompt", () => {
    expect(() =>
      createQuestionPresentation("Q-001", " ", [
        { id: "A", text: "H2O" },
        { id: "B", text: "CO2" },
      ])
    ).toThrow("Question prompt is required.");
  });

  it("requires at least two choices", () => {
    expect(() =>
      createQuestionPresentation("Q-001", "What is water?", [
        { id: "A", text: "H2O" },
      ])
    ).toThrow("A question must have at least two choices.");
  });
});