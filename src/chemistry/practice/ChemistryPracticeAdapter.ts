import {
  submitPracticeAnswer,
} from "../../game/practice/PracticeSession";

import type {
  PracticeSession,
  PracticeSubmissionStatus,
} from "../../game/practice/PracticeTypes";

import type {
  AnswerKeyIntakeRecord,
} from "../answer-keys/AnswerKeyIntake";

import {
  resolveAnswerKey,
  resolvePinnedAnswerKey,
} from "../answer-keys/AnswerKeyRegistry";

import type {
  ChemistryQuestionSnapshot,
} from "../answer-keys/AnswerKeyRegistry";

import {
  evaluateAnswer,
} from "./AnswerEvaluator";

import type {
  AnswerEvaluation,
} from "./AnswerEvaluator";

import {
  createFeedback,
} from "./FeedbackService";

import type {
  AnswerFeedback,
} from "./FeedbackService";

import {
  createSessionSummary,
} from "./SessionSummary";

import type {
  PracticeSessionSummary as ChemistrySessionSummary,
} from "./SessionSummary";

const UNANSWERED_TOKEN = "chemistry:unanswered";
const ANSWERED_PREFIX = "chemistry:answered:";

export type ChemistryAnswerKeyPin =
  | {
      readonly status: "pinned";
      readonly answerKeyId: string;
      readonly answerKeyVersion: number;
    }
  | {
      readonly status: "unavailable";
    };

export interface ChemistryPracticeSession {
  readonly baseSession: PracticeSession;
  readonly questionSnapshots: Readonly<
    Record<string, ChemistryQuestionSnapshot>
  >;
  readonly answerKeyPins: Readonly<
    Record<string, ChemistryAnswerKeyPin>
  >;
}

export type CreateChemistryPracticeSessionInput = {
  readonly baseSession: PracticeSession;
  readonly questionSnapshots: readonly ChemistryQuestionSnapshot[];
  readonly answerKeys: readonly AnswerKeyIntakeRecord[];
};

export function createChemistryPracticeSession(
  input: CreateChemistryPracticeSessionInput
): ChemistryPracticeSession {
  if (
    !input ||
    !input.baseSession ||
    !Array.isArray(input.questionSnapshots) ||
    !Array.isArray(input.answerKeys)
  ) {
    throw new Error("Invalid chemistry practice session input.");
  }

  const snapshots: Record<string, ChemistryQuestionSnapshot> =
    Object.create(null);

  for (const snapshot of input.questionSnapshots) {
    if (
      !snapshot ||
      typeof snapshot.questionId !== "string" ||
      snapshot.questionId.trim().length === 0
    ) {
      throw new Error("Invalid question snapshot.");
    }

    if (snapshots[snapshot.questionId]) {
      throw new Error("Duplicate question snapshot.");
    }

    snapshots[snapshot.questionId] = Object.freeze({
      ...snapshot,
      choiceIds: Object.freeze([...snapshot.choiceIds]),
    });
  }

  const pins: Record<string, ChemistryAnswerKeyPin> =
    Object.create(null);

  for (const questionId of input.baseSession.questionIds) {
    const snapshot = snapshots[questionId];

    if (!snapshot) {
      pins[questionId] = Object.freeze({
        status: "unavailable",
      });
      continue;
    }

    const resolution = resolveAnswerKey(
      input.answerKeys,
      snapshot
    );

    if (resolution.status !== "eligible") {
      pins[questionId] = Object.freeze({
        status: "unavailable",
      });
      continue;
    }

    pins[questionId] = Object.freeze({
      status: "pinned",
      answerKeyId: resolution.record.answerKeyId,
      answerKeyVersion: resolution.record.version,
    });
  }

  return Object.freeze({
    baseSession: input.baseSession,
    questionSnapshots: Object.freeze(snapshots),
    answerKeyPins: Object.freeze(pins),
  });
}

function encodeAnswer(answer: string | null): string {
  if (answer === null || answer.trim().length === 0) {
    return UNANSWERED_TOKEN;
  }

  return `${ANSWERED_PREFIX}${encodeURIComponent(answer.trim())}`;
}

function decodeAnswer(token: string): string | null {
  if (token === UNANSWERED_TOKEN) {
    return null;
  }

  if (!token.startsWith(ANSWERED_PREFIX)) {
    throw new Error("Invalid chemistry answer token.");
  }

  try {
    return decodeURIComponent(token.slice(ANSWERED_PREFIX.length));
  } catch {
    throw new Error("Invalid encoded chemistry answer.");
  }
}

export type ChemistrySubmissionStatus =
  | PracticeSubmissionStatus
  | "evaluation_unavailable";

export type ChemistrySubmissionResult = {
  status: ChemistrySubmissionStatus;
  session: ChemistryPracticeSession;
  evaluation: AnswerEvaluation | null;
  feedback: AnswerFeedback | null;
};

function unavailableResult(
  session: ChemistryPracticeSession
): ChemistrySubmissionResult {
  return {
    status: "evaluation_unavailable",
    session,
    evaluation: null,
    feedback: createFeedback(null, true),
  };
}

export function submitChemistryAnswer(
  session: ChemistryPracticeSession,
  questionId: string,
  selectedAnswer: string | null,
  answerKeys: readonly AnswerKeyIntakeRecord[]
): ChemistrySubmissionResult {
  if (
    selectedAnswer !== null &&
    typeof selectedAnswer !== "string"
  ) {
    return {
      status: "invalid_submission",
      session,
      evaluation: null,
      feedback: null,
    };
  }

  const snapshot = session.questionSnapshots[questionId];
  const pin = session.answerKeyPins[questionId];

  if (!snapshot || !pin || pin.status !== "pinned") {
    return unavailableResult(session);
  }

  if (
    selectedAnswer !== null &&
    selectedAnswer.trim().length > 0 &&
    !snapshot.choiceIds.includes(selectedAnswer.trim())
  ) {
    return {
      status: "invalid_submission",
      session,
      evaluation: null,
      feedback: null,
    };
  }

  const resolution = resolvePinnedAnswerKey(
    answerKeys,
    snapshot,
    pin.answerKeyId,
    pin.answerKeyVersion
  );

  if (resolution.status !== "eligible") {
    return unavailableResult(session);
  }

  const result = submitPracticeAnswer(
    session.baseSession,
    questionId,
    encodeAnswer(selectedAnswer)
  );

  if (result.status !== "accepted") {
    return {
      status: result.status,
      session,
      evaluation: null,
      feedback: null,
    };
  }

  const evaluation = evaluateAnswer(
    snapshot,
    selectedAnswer,
    resolution.record
  );

  const nextSession: ChemistryPracticeSession = Object.freeze({
    ...session,
    baseSession: result.session,
  });

  return {
    status: "accepted",
    session: nextSession,
    evaluation,
    feedback: createFeedback(evaluation),
  };
}

export function getChemistrySessionSummary(
  session: ChemistryPracticeSession,
  answerKeys: readonly AnswerKeyIntakeRecord[]
): ChemistrySessionSummary {
  const evaluations = session.baseSession.questionIds.map(
    (questionId) => {
      const snapshot = session.questionSnapshots[questionId];
      const pin = session.answerKeyPins[questionId];

      if (
        !snapshot ||
        !pin ||
        pin.status !== "pinned"
      ) {
        return null;
      }

      const resolution = resolvePinnedAnswerKey(
        answerKeys,
        snapshot,
        pin.answerKeyId,
        pin.answerKeyVersion
      );

      if (resolution.status !== "eligible") {
        return null;
      }

      const submission =
        session.baseSession.submissions[questionId];

      const selectedAnswer = submission
        ? decodeAnswer(submission.answerToken)
        : null;

      return evaluateAnswer(
        snapshot,
        selectedAnswer,
        resolution.record
      );
    }
  );

  return createSessionSummary(evaluations);
}