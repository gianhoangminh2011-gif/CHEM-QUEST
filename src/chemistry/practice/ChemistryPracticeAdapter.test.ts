import { describe, expect, it } from "vitest";

import {
  createPracticeSession,
} from "../../game/practice/PracticeSession";

import {
  quarantineAnswerKey,
} from "../answer-keys/AnswerKeyIntake";

import {
  createApprovedTestAnswerKey,
} from "../answer-keys/AnswerKeyTestFactory";

import type {
  ChemistryQuestionSnapshot,
} from "../answer-keys/AnswerKeyRegistry";

import {
  createChemistryPracticeSession,
  getChemistrySessionSummary,
  submitChemistryAnswer,
} from "./ChemistryPracticeAdapter";

const question1: ChemistryQuestionSnapshot = {
  questionId: "Q-001",
  questionVersion: "v1",
  fingerprint: "fingerprint-001",
  choiceIds: ["A", "B", "C", "D"],
};

const question2: ChemistryQuestionSnapshot = {
  questionId: "Q-002",
  questionVersion: "v1",
  fingerprint: "fingerprint-002",
  choiceIds: ["A", "B", "C", "D"],
};

function createSession(
  sessionId: string,
  questionIds: string[],
  snapshots: ChemistryQuestionSnapshot[],
  keys: ReturnType<typeof createApprovedTestAnswerKey>[]
) {
  const baseSession = createPracticeSession({
    sessionId,
    questionIds,
  });

  if (!baseSession) {
    throw new Error("Test session could not be created.");
  }

  return createChemistryPracticeSession({
    baseSession,
    questionSnapshots: snapshots,
    answerKeys: keys,
  });
}

describe("ChemistryPracticeAdapter", () => {
  it("evaluates a correct answer with the pinned approved key", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-001",
      ["Q-001"],
      [question1],
      [key]
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "A",
      [key]
    );

    expect(result.status).toBe("accepted");
    expect(result.evaluation?.isCorrect).toBe(true);
    expect(result.feedback?.status).toBe("correct");
    expect(result.session.baseSession.status).toBe("completed");
  });

  it("evaluates an incorrect answer", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-002",
      ["Q-001"],
      [question1],
      [key]
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "B",
      [key]
    );

    expect(result.status).toBe("accepted");
    expect(result.evaluation?.isCorrect).toBe(false);
    expect(result.feedback?.status).toBe("incorrect");
  });

  it("classifies an unanswered question only when its key is eligible", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-003",
      ["Q-001"],
      [question1],
      [key]
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      null,
      [key]
    );

    expect(result.status).toBe("accepted");
    expect(result.feedback?.status).toBe("unanswered");
  });

  it("fails closed when no approved key exists", () => {
    const session = createSession(
      "S-004",
      ["Q-001"],
      [question1],
      []
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "A",
      []
    );

    expect(result.status).toBe("evaluation_unavailable");
    expect(result.feedback?.status).toBe("unavailable");
    expect(result.session).toBe(session);
    expect(result.session.baseSession.currentQuestionIndex).toBe(0);
    expect(
      result.session.baseSession.submissions["Q-001"]
    ).toBeUndefined();
  });

  it("does not accept a caller-supplied correct answer", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-005",
      ["Q-001"],
      [question1],
      [key]
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "B",
      [key]
    );

    expect(result.evaluation?.isCorrect).toBe(false);
  });

  it("fails closed when the pinned key is quarantined", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-006",
      ["Q-001"],
      [question1],
      [key]
    );

    const quarantined = quarantineAnswerKey(
      key,
      "Test quarantine",
      "2026-01-02T10:00:00.000Z"
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "A",
      [quarantined]
    );

    expect(result.status).toBe("evaluation_unavailable");
    expect(result.session).toBe(session);
    expect(result.session.baseSession.currentQuestionIndex).toBe(0);
    expect(
      result.session.baseSession.submissions["Q-001"]
    ).toBeUndefined();
  });

  it("does not silently switch to a newer answer-key version", () => {
    const originalKey = createApprovedTestAnswerKey();
    const session = createSession(
      "S-007",
      ["Q-001"],
      [question1],
      [originalKey]
    );

    const newerKey = createApprovedTestAnswerKey(
      "Q-001",
      "B",
      "v1",
      "fingerprint-001",
      "AK-Q-001-NEW",
      2
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "B",
      [newerKey]
    );

    expect(result.status).toBe("evaluation_unavailable");
    expect(result.session.baseSession.currentQuestionIndex).toBe(0);
  });

  it("rejects duplicate submissions", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-008",
      ["Q-001", "Q-002"],
      [question1, question2],
      [key]
    );

    const first = submitChemistryAnswer(
      session,
      "Q-001",
      "A",
      [key]
    );

    const second = submitChemistryAnswer(
      first.session,
      "Q-001",
      "B",
      [key]
    );

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("duplicate");
    expect(second.evaluation).toBeNull();
    expect(second.feedback).toBeNull();
  });

  it("rejects a choice ID that is not in the question snapshot", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-009",
      ["Q-001"],
      [question1],
      [key]
    );

    const result = submitChemistryAnswer(
      session,
      "Q-001",
      "Z",
      [key]
    );

    expect(result.status).toBe("invalid_submission");
    expect(result.session.baseSession.currentQuestionIndex).toBe(0);
  });

  it("counts unavailable separately from unanswered", () => {
    const key1 = createApprovedTestAnswerKey(
      "Q-001",
      "A",
      "v1",
      "fingerprint-001"
    );

    const session = createSession(
      "S-010",
      ["Q-001", "Q-002"],
      [question1, question2],
      [key1]
    );

    const first = submitChemistryAnswer(
      session,
      "Q-001",
      null,
      [key1]
    );

    expect(first.status).toBe("accepted");

    const summary = getChemistrySessionSummary(
      first.session,
      [key1]
    );

    expect(summary).toEqual({
      totalQuestions: 2,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unansweredQuestions: 1,
      evaluationUnavailable: 1,
    });
  });

  it("counts a previously submitted answer as unavailable after quarantine", () => {
    const key = createApprovedTestAnswerKey();
    const session = createSession(
      "S-011",
      ["Q-001"],
      [question1],
      [key]
    );

    const submitted = submitChemistryAnswer(
      session,
      "Q-001",
      "A",
      [key]
    );

    const quarantined = quarantineAnswerKey(
      key,
      "Post-submission test quarantine",
      "2026-01-02T10:00:00.000Z"
    );

    const summary = getChemistrySessionSummary(
      submitted.session,
      [quarantined]
    );

    expect(summary.evaluationUnavailable).toBe(1);
    expect(summary.correctAnswers).toBe(0);
    expect(summary.totalQuestions).toBe(
      summary.correctAnswers +
        summary.incorrectAnswers +
        summary.unansweredQuestions +
        summary.evaluationUnavailable
    );
  });
});