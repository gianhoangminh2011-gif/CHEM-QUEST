
export type AnswerKeyRecordStatus =
  | "draft"
  | "in_review"
  | "complete"
  | "rejected"
  | "quarantined"
  | "revoked";

export type AnswerKeyVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type AnswerKeyApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface AnswerKeySource {
  sourceId: string;
  sourceType: string;
  locator: string;
  capturedAt: string;
  contentFingerprint: string;
}

export interface AnswerKeyIntakeInput {
  answerKeyId: string;
  questionId: string;
  questionVersion: string;
  questionSnapshotFingerprint: string;
  correctChoiceId: string;
  sources: readonly AnswerKeySource[];
  submittedBy: string;
  submittedAt: string;
  version: number;
  supersedesAnswerKeyId?: string | null;
}

export interface AnswerKeyIntakeRecord {
  answerKeyId: string;
  questionId: string;
  questionVersion: string;
  questionSnapshotFingerprint: string;
  correctChoiceId: string;
  sources: readonly Readonly<AnswerKeySource>[];
  submittedBy: string;
  submittedAt: string;
  version: number;
  supersedesAnswerKeyId: string | null;
  recordStatus: AnswerKeyRecordStatus;
  verificationStatus: AnswerKeyVerificationStatus;
  approvalStatus: AnswerKeyApprovalStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationDecisionRef: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalDecisionRef: string | null;
  quarantineReason: string | null;
  quarantinedAt: string | null;
  revokedReason: string | null;
  revokedAt: string | null;
}

function required(
  value: unknown,
  field: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
}

function validTimestamp(value: string, field: string): void {
  required(value, field);

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid timestamp.`);
  }
}

function freezeRecord(
  record: AnswerKeyIntakeRecord
): AnswerKeyIntakeRecord {
  const sources = Object.freeze(
    record.sources.map((source) =>
      Object.freeze({ ...source })
    )
  );

  return Object.freeze({
    ...record,
    sources,
  });
}

function copyWith(
  record: AnswerKeyIntakeRecord,
  changes: Partial<AnswerKeyIntakeRecord>
): AnswerKeyIntakeRecord {
  return freezeRecord({
    ...record,
    ...changes,
  });
}

export function createAnswerKeyIntake(
  input: AnswerKeyIntakeInput
): AnswerKeyIntakeRecord {
  required(input.answerKeyId, "Answer-key ID");
  required(input.questionId, "Question ID");
  required(input.questionVersion, "Question version");
  required(
    input.questionSnapshotFingerprint,
    "Question snapshot fingerprint"
  );
  required(input.correctChoiceId, "Correct choice ID");
  required(input.submittedBy, "Submitter");
  validTimestamp(input.submittedAt, "Submission timestamp");

  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("Answer-key version must be a positive integer.");
  }

  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new Error("At least one source reference is required.");
  }

  const sourceIds = new Set<string>();

  for (const source of input.sources) {
    required(source.sourceId, "Source ID");
    required(source.sourceType, "Source type");
    required(source.locator, "Source locator");
    required(
      source.contentFingerprint,
      "Source content fingerprint"
    );
    validTimestamp(
      source.capturedAt,
      "Source capture timestamp"
    );

    const normalizedId = source.sourceId.trim();

    if (sourceIds.has(normalizedId)) {
      throw new Error("Source IDs must be unique.");
    }

    sourceIds.add(normalizedId);
  }

  if (input.supersedesAnswerKeyId != null) {
    required(
      input.supersedesAnswerKeyId,
      "Superseded answer-key ID"
    );

    if (
      input.supersedesAnswerKeyId.trim() ===
      input.answerKeyId.trim()
    ) {
      throw new Error("An answer key cannot supersede itself.");
    }
  }

  return freezeRecord({
    answerKeyId: input.answerKeyId.trim(),
    questionId: input.questionId.trim(),
    questionVersion: input.questionVersion.trim(),
    questionSnapshotFingerprint:
      input.questionSnapshotFingerprint.trim(),
    correctChoiceId: input.correctChoiceId.trim(),

    sources: input.sources.map((source) => ({
      sourceId: source.sourceId.trim(),
      sourceType: source.sourceType.trim(),
      locator: source.locator.trim(),
      capturedAt: source.capturedAt.trim(),
      contentFingerprint: source.contentFingerprint.trim(),
    })),

    submittedBy: input.submittedBy.trim(),
    submittedAt: input.submittedAt.trim(),
    version: input.version,
    supersedesAnswerKeyId:
      input.supersedesAnswerKeyId?.trim() || null,

    recordStatus: "draft",
    verificationStatus: "pending",
    approvalStatus: "pending",

    verifiedBy: null,
    verifiedAt: null,
    verificationDecisionRef: null,

    approvedBy: null,
    approvedAt: null,
    approvalDecisionRef: null,

    quarantineReason: null,
    quarantinedAt: null,
    revokedReason: null,
    revokedAt: null,
  });
}

export function submitAnswerKeyForReview(
  record: AnswerKeyIntakeRecord
): AnswerKeyIntakeRecord {
  if (record.recordStatus !== "draft") {
    throw new Error(
      "Only a draft answer key can be submitted for review."
    );
  }

  return copyWith(record, {
    recordStatus: "in_review",
  });
}

export function verifyAnswerKey(
  record: AnswerKeyIntakeRecord,
  reviewerId: string,
  verifiedAt: string,
  decision: "verified" | "rejected",
  decisionRef: string | null = null
): AnswerKeyIntakeRecord {
  if (record.recordStatus !== "in_review") {
    throw new Error(
      "Only an answer key in review can be verified."
    );
  }

  if (record.verificationStatus !== "pending") {
    throw new Error(
      "This answer key has already been verified."
    );
  }

  required(reviewerId, "Reviewer");
  validTimestamp(verifiedAt, "Verification timestamp");

  if (reviewerId.trim() === record.submittedBy) {
    throw new Error(
      "The submitter cannot verify their own answer key."
    );
  }

  if (decision !== "verified" && decision !== "rejected") {
    throw new Error("Invalid verification decision.");
  }

  return copyWith(record, {
    verificationStatus: decision,
    recordStatus:
      decision === "verified" ? "in_review" : "rejected",
    approvalStatus:
      decision === "verified" ? "pending" : "rejected",
    verifiedBy: reviewerId.trim(),
    verifiedAt: verifiedAt.trim(),
    verificationDecisionRef: decisionRef?.trim() || null,
  });
}

export function approveAnswerKey(
  record: AnswerKeyIntakeRecord,
  approverId: string,
  approvedAt: string,
  decisionRef: string | null = null
): AnswerKeyIntakeRecord {
  if (
    record.recordStatus !== "in_review" ||
    record.verificationStatus !== "verified"
  ) {
    throw new Error(
      "Only a verified answer key can be approved."
    );
  }

  if (record.approvalStatus !== "pending") {
    throw new Error(
      "This answer key has already received an approval decision."
    );
  }

  required(approverId, "Approver");
  validTimestamp(approvedAt, "Approval timestamp");

  if (
    approverId.trim() === record.submittedBy ||
    approverId.trim() === record.verifiedBy
  ) {
    throw new Error(
      "Approval must be performed by an independent approver."
    );
  }

  return copyWith(record, {
    recordStatus: "complete",
    approvalStatus: "approved",
    approvedBy: approverId.trim(),
    approvedAt: approvedAt.trim(),
    approvalDecisionRef: decisionRef?.trim() || null,
  });
}

export function quarantineAnswerKey(
  record: AnswerKeyIntakeRecord,
  reason: string,
  quarantinedAt: string
): AnswerKeyIntakeRecord {
  if (record.recordStatus !== "complete") {
    throw new Error(
      "Only a completed answer key can be quarantined."
    );
  }

  required(reason, "Quarantine reason");
  validTimestamp(quarantinedAt, "Quarantine timestamp");

  return copyWith(record, {
    recordStatus: "quarantined",
    quarantineReason: reason.trim(),
    quarantinedAt: quarantinedAt.trim(),
  });
}

export function revokeAnswerKey(
  record: AnswerKeyIntakeRecord,
  reason: string,
  revokedAt: string
): AnswerKeyIntakeRecord {
  if (
    record.recordStatus !== "complete" &&
    record.recordStatus !== "quarantined"
  ) {
    throw new Error(
      "Only a completed or quarantined answer key can be revoked."
    );
  }

  required(reason, "Revocation reason");
  validTimestamp(revokedAt, "Revocation timestamp");

  return copyWith(record, {
    recordStatus: "revoked",
    revokedReason: reason.trim(),
    revokedAt: revokedAt.trim(),
  });
}
