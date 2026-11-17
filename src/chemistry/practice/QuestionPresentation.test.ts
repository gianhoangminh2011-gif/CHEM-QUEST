
import { describe, expect, it } from "vitest";

import {
  createQuestionPresentation,
} from "./QuestionPresentation";

describe("QuestionPresentation", () => {
  it("creates valid question presentation data", () => {
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
      createQuestionPresentation(" ", "What is water?", [
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

  it("rejects choices with blank IDs", () => {
    expect(() =>
      createQuestionPresentation("Q-001", "What is water?", [
        { id: " ", text: "H2O" },
        { id: "B", text: "CO2" },
      ])
    ).toThrow("Every choice must have a valid ID.");
  });

  it("rejects choices with blank text", () => {
    expect(() =>
      createQuestionPresentation("Q-001", "What is water?", [
        { id: "A", text: " " },
        { id: "B", text: "CO2" },
      ])
    ).toThrow("Every choice must have valid text.");
  });

  it("rejects duplicate choice IDs", () => {
    expect(() =>
      createQuestionPresentation("Q-001", "What is water?", [
        { id: "A", text: "H2O" },
        { id: "A", text: "CO2" },
      ])
    ).toThrow("Choice IDs must be unique.");
  });

  it("normalizes surrounding whitespace", () => {
    expect(
      createQuestionPresentation(" Q-001 ", " What is water? ", [
        { id: " A ", text: " H2O " },
        { id: " B ", text: " CO2 " },
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
});
