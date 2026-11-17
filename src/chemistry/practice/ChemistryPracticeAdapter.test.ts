
import { describe, expect, it } from "vitest";

import {
  createPracticeSession,
} from "../../game/practice/PracticeSession";

import {
  submitChemistryAnswer,
  getChemistrySessionSummary,
} from "./ChemistryPracticeAdapter";

describe("ChemistryPracticeAdapter", () => {
  it("evaluates an accepted correct answer", () => {
    const session = createPracticeSession({
      sessionId: "S-001",
      questionIds: ["Q-001"],
    })!;

    const result = submitChemistryAnswer(
      session, "Q-001", "A", "A"
    );

    expect(result.status).toBe("accepted");
    expect(result.evaluation?.isCorrect).toBe(true);
    expect(result.feedback?.status).toBe("correct");
    expect(result.session.status).toBe("completed");
  });

  it("evaluates an incorrect answer", () => {
    const session = createPracticeSession({
      sessionId: "S-002",
      questionIds: ["Q-001"],
    })!;

    const result = submitChemistryAnswer(
      session, "Q-001", "B", "A"
    );

    expect(result.status).toBe("accepted");
    expect(result.evaluation?.isCorrect).toBe(false);
    expect(result.feedback?.status).toBe("incorrect");
  });

  it("supports unanswered questions", () => {
    const session = createPracticeSession({
      sessionId: "S-003",
      questionIds: ["Q-001"],
    })!;

    const result = submitChemistryAnswer(
      session, "Q-001", null, "A"
    );

    expect(result.status).toBe("accepted");
    expect(result.feedback?.status).toBe("unanswered");
  });

  it("rejects duplicate submissions without feedback", () => {
    const session = createPracticeSession({
      sessionId: "S-004",
      questionIds: ["Q-001", "Q-002"],
    })!;

    const first = submitChemistryAnswer(
      session, "Q-001", "A", "A"
    );

    const second = submitChemistryAnswer(
      first.session, "Q-001", "B", "A"
    );

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("duplicate");
    expect(second.feedback).toBeNull();
    expect(second.evaluation).toBeNull();
  });

  it("summarizes correct, incorrect, and unanswered questions", () => {
    const session = createPracticeSession({
      sessionId: "S-005",
      questionIds: ["Q-001", "Q-002", "Q-003"],
    })!;

    const first = submitChemistryAnswer(
      session, "Q-001", "A", "A"
    );

    const second = submitChemistryAnswer(
      first.session, "Q-002", "B", "A"
    );

    const third = submitChemistryAnswer(
      second.session, "Q-003", null, "C"
    );

    expect(third.session.status).toBe("completed");

    expect(
      getChemistrySessionSummary(third.session, {
        "Q-001": "A",
        "Q-002": "A",
        "Q-003": "C",
      })
    ).toEqual({
      totalQuestions: 3,
      correctAnswers: 1,
      incorrectAnswers: 1,
      unansweredQuestions: 1,
    });
  });

  it("rejects summaries with missing correct answers", () => {
    const session = createPracticeSession({
      sessionId: "S-006",
      questionIds: ["Q-001"],
    })!;

    expect(() =>
      getChemistrySessionSummary(session, {})
    ).toThrow("Missing correct answer for Q-001.");
  });

  it("rejects an empty correct answer", () => {
    const session = createPracticeSession({
      sessionId: "S-007",
      questionIds: ["Q-001"],
    })!;

    expect(() =>
      submitChemistryAnswer(session, "Q-001", "A", " ")
    ).toThrow("A valid correct answer is required.");
  });

  it("rejects an empty correct answer before changing the session", () => {
    const session = createPracticeSession({
      sessionId: "S-008",
      questionIds: ["Q-001"],
    })!;

    expect(() =>
      submitChemistryAnswer(session, "Q-001", "A", "")
    ).toThrow();

    expect(session.currentQuestionIndex).toBe(0);
    expect(session.status).toBe("active");
    expect(session.submissions["Q-001"]).toBeUndefined();
  });
});
