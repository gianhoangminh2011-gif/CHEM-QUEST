
export type AnswerKeySourceReference = Readonly<{
  sourceId: string;
  sourceType: string;
  locator: string;
  capturedAt: string;
  contentFingerprint: string;
}>;

export type AnswerKeyIntakeInput = Readonly<{
  answerKeyId: string;
  questionId: string;
  questionVersion: string;
  questionSnapshotFingerprint: string;
  correctChoiceId: string;
  sources: readonly AnswerKeySourceReference[];
  submittedBy: string;
  submittedAt: string;
  version: number;
  supersedesAnswerKeyId?: string | null;
}>;

export type AnswerKeyIntakeRecord = Readonly<{
  answerKeyId: string;
  questionId: string;
  questionVersion: string;
  questionSnapshotFingerprint: string;
  correctChoiceId: string;
  sources: readonly AnswerKeySourceReference[];
  submittedBy: string;
  submittedAt: string;
  version: number;
  supersedesAnswerKeyId: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy: string | null;
  verifiedAt: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  recordStatus:
    | "draft"
    | "in_review"
    | "complete"
    | "rejected"
    | "quarantined"
    | "revoked";
}>;

function required(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
}

function freezeRecord(
  record: AnswerKeyIntakeRecord
): AnswerKeyIntakeRecord {
  const sources = Object.freeze(
    record.sources.map((source) => Object.freeze({ ...source }))
  );
  return Object.freeze({ ...record, sources });
}

export function createAnswerKeyIntake(
  input: AnswerKeyIntakeInput
): AnswerKeyIntakeRecord {
  required(input.answerKeyId, "Answer-key ID");
  required(input.questionId, "Question ID");
  required(input.questionVersion, "Question version");
  required(input.questionSnapshotFingerprint, "Question snapshot fingerprint");
  required(input.correctChoiceId, "Correct choice ID");
  required(input.submittedBy, "Submitter");
  required(input.submittedAt, "Submission timestamp");

  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error("Answer-key version must be a positive integer.");
  }

  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new Error("At least one source reference is required.");
  }

  for (const source of input.sources) {
    required(source.sourceId, "Source ID");
    required(source.sourceType, "Source type");
    required(source.locator, "Source locator");
    required(source.capturedAt, "Source capture timestamp");
    required(source.contentFingerprint, "Source content fingerprint");
  }

  return freezeRecord({
    ...input,
    sources: input.sources,
    supersedesAnswerKeyId: input.supersedesAnswerKeyId ?? null,
    verificationStatus: "pending",
    verifiedBy: null,
    verifiedAt: null,
    approvalStatus: "pending",
    approvedBy: null,
    approvedAt: null,
    recordStatus: "draft",
  });
}

export function submitAnswerKeyForReview(
  record: AnswerKeyIntakeRecord
): AnswerKeyIntakeRecord {
  if (record.recordStatus !== "draft") {
    throw new Error("Only a draft answer key can be submitted for review.");
  }

  return freezeRecord({ ...record, recordStatus: "in_review" });
}

export function verifyAnswerKey(
  record: AnswerKeyIntakeRecord,
  verifier: string,
  verifiedAt: string,
  decision: "verified" | "rejected"
): AnswerKeyIntakeRecord {
  required(verifier, "Verifier");
  required(verifiedAt, "Verification timestamp");

  if (record.recordStatus !== "in_review") {
    throw new Error("Only an answer key under review can be verified.");
  }

  if (verifier === record.submittedBy) {
    throw new Error("The submitter cannot verify their own answer key.");
  }

  return freezeRecord({
    ...record,
    verificationStatus: decision,
    verifiedBy: verifier,
    verifiedAt,
    recordStatus: decision === "verified" ? "in_review" : "rejected",
  });
}

export function approveAnswerKey(
  record: AnswerKeyIntakeRecord,
  approver: string,
  approvedAt: string
): AnswerKeyIntakeRecord {
  required(approver, "Approver");
  required(approvedAt, "Approval timestamp");

  if (
    record.recordStatus !== "in_review" ||
    record.verificationStatus !== "verified" ||
    !record.verifiedBy
  ) {
    throw new Error("Only a verified answer key can be approved.");
  }

  if (approver === record.submittedBy || approver === record.verifiedBy) {
    throw new Error("Approval must be performed by an independent approver.");
  }

  return freezeRecord({
    ...record,
    approvalStatus: "approved",
    approvedBy: approver,
    approvedAt,
    recordStatus: "complete",
  });
}

export function quarantineAnswerKey(
  record: AnswerKeyIntakeRecord,
  reason: string
): AnswerKeyIntakeRecord {
  required(reason, "Quarantine reason");

  if (record.recordStatus !== "complete") {
    throw new Error("Only a completed answer key can be quarantined.");
  }

  return freezeRecord({ ...record, recordStatus: "quarantined" });
}

export function revokeAnswerKey(
  record: AnswerKeyIntakeRecord,
  reason: string
): AnswerKeyIntakeRecord {
  required(reason, "Revocation reason");

  if (
    record.recordStatus !== "complete" &&
    record.recordStatus !== "quarantined"
  ) {
    throw new Error("Only a completed or quarantined answer key can be revoked.");
  }

  return freezeRecord({ ...record, recordStatus: "revoked" });
}
