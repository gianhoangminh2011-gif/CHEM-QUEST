import type { AnswerKeyIntakeRecord } from "./AnswerKeyIntake";

export interface ChemistryQuestionSnapshot {
  readonly questionId: string;
  readonly questionVersion: string;
  readonly fingerprint: string;
  readonly choiceIds: readonly string[];
}

export interface EligibleAnswerKey {
  readonly status: "eligible";
  readonly record: AnswerKeyIntakeRecord;
}

export interface UnavailableAnswerKey {
  readonly status: "unavailable";
  readonly reason:
    | "NO_MATCHING_KEY"
    | "AMBIGUOUS_KEYS"
    | "INVALID_KEY"
    | "QUESTION_MISMATCH"
    | "CHOICE_MISMATCH";
}

export type AnswerKeyResolution =
  | EligibleAnswerKey
  | UnavailableAnswerKey;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidSources(record: AnswerKeyIntakeRecord): boolean {
  return (
    Array.isArray(record.sources) &&
    record.sources.length > 0 &&
    record.sources.every(
      (source) =>
        nonEmpty(source.sourceId) &&
        nonEmpty(source.sourceType) &&
        nonEmpty(source.locator) &&
        nonEmpty(source.capturedAt) &&
        nonEmpty(source.contentFingerprint)
    )
  );
}

function hasIndependentApprovals(
  record: AnswerKeyIntakeRecord
): boolean {
  return (
    nonEmpty(record.submittedBy) &&
    nonEmpty(record.verifiedBy) &&
    nonEmpty(record.approvedBy) &&
    record.submittedBy !== record.verifiedBy &&
    record.submittedBy !== record.approvedBy &&
    record.verifiedBy !== record.approvedBy
  );
}

function hasDecisionEvidence(record: AnswerKeyIntakeRecord): boolean {
  return (
    nonEmpty(record.verificationDecisionRef) &&
    nonEmpty(record.approvalDecisionRef) &&
    nonEmpty(record.verifiedAt) &&
    nonEmpty(record.approvedAt)
  );
}

function isEligibleRecord(
  record: AnswerKeyIntakeRecord,
  question: ChemistryQuestionSnapshot
): boolean {
  return (
    record.recordStatus === "complete" &&
    record.verificationStatus === "verified" &&
    record.approvalStatus === "approved" &&
    record.questionId === question.questionId &&
    record.questionVersion === question.questionVersion &&
    record.questionSnapshotFingerprint === question.fingerprint &&
    nonEmpty(record.answerKeyId) &&
    Number.isInteger(record.version) &&
    record.version > 0 &&
    nonEmpty(record.correctChoiceId) &&
    question.choiceIds.includes(record.correctChoiceId) &&
    hasValidSources(record) &&
    hasIndependentApprovals(record) &&
    hasDecisionEvidence(record)
  );
}

/**
 * Resolves exactly one active, verified and approved key for a question snapshot.
 * More than one completed candidate is treated as ambiguous and fails closed.
 */
export function resolveAnswerKey(
  records: readonly AnswerKeyIntakeRecord[],
  question: ChemistryQuestionSnapshot
): AnswerKeyResolution {
  if (
    !nonEmpty(question.questionId) ||
    !nonEmpty(question.questionVersion) ||
    !nonEmpty(question.fingerprint) ||
    !Array.isArray(question.choiceIds) ||
    question.choiceIds.length === 0 ||
    question.choiceIds.some((id) => !nonEmpty(id)) ||
    new Set(question.choiceIds).size !== question.choiceIds.length
  ) {
    return { status: "unavailable", reason: "QUESTION_MISMATCH" };
  }

  const candidates = records.filter(
    (record) =>
      record.questionId === question.questionId &&
      record.questionVersion === question.questionVersion &&
      record.questionSnapshotFingerprint === question.fingerprint &&
      record.recordStatus === "complete"
  );

  if (candidates.length === 0) {
    return { status: "unavailable", reason: "NO_MATCHING_KEY" };
  }

  if (candidates.length > 1) {
    return { status: "unavailable", reason: "AMBIGUOUS_KEYS" };
  }

  const record = candidates[0];

  if (
    !record ||
    !isEligibleRecord(record, question)
  ) {
    return { status: "unavailable", reason: "INVALID_KEY" };
  }

  return {
    status: "eligible",
    record,
  };
}

/**
 * Re-resolves only the exact key pinned by the session.
 * It never substitutes a newer key.
 */
export function resolvePinnedAnswerKey(
  records: readonly AnswerKeyIntakeRecord[],
  question: ChemistryQuestionSnapshot,
  pinnedAnswerKeyId: string,
  pinnedAnswerKeyVersion: number
): AnswerKeyResolution {
  const exactMatches = records.filter(
    (record) =>
      record.answerKeyId === pinnedAnswerKeyId &&
      record.version === pinnedAnswerKeyVersion
  );

  if (exactMatches.length !== 1) {
    return {
      status: "unavailable",
      reason: "NO_MATCHING_KEY",
    };
  }

  const exactRecord = exactMatches[0];

  if (!exactRecord) {
    return {
      status: "unavailable",
      reason: "NO_MATCHING_KEY",
    };
  }

  if (
    exactRecord.questionId !== question.questionId ||
    exactRecord.questionVersion !== question.questionVersion ||
    exactRecord.questionSnapshotFingerprint !== question.fingerprint
  ) {
    return {
      status: "unavailable",
      reason: "QUESTION_MISMATCH",
    };
  }

  if (!isEligibleRecord(exactRecord, question)) {
    return {
      status: "unavailable",
      reason: "INVALID_KEY",
    };
  }

  return {
    status: "eligible",
    record: exactRecord,
  };
}