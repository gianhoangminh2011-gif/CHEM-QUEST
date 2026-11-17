
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

function validTimestamp(value: string, field: string): number {
  required(value, field);

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`${field} must be a valid timestamp.`);
  }

  return timestamp;
}

function validateDecisionRef(
  decisionRef: string | null,
  field: string
): void {
  if (decisionRef !== null) {
    required(decisionRef, field);
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

  const submittedAtMs = validTimestamp(
    input.submittedAt,
    "Submission timestamp"
  );

  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("Answer-key version must be a positive integer.");
  }

  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new Error("At least one source reference is required.");
  }

  const sourceIds = new Set<string>();

  for (const source of input.sources) {
    if (
      source === null ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      throw new Error("Each source reference must be an object.");
    }

    required(source.sourceId, "Source ID");
    required(source.sourceType, "Source type");
    required(source.locator, "Source locator");
    required(
      source.contentFingerprint,
      "Source content fingerprint"
    );

    const capturedAtMs = validTimestamp(
      source.capturedAt,
      "Source capture timestamp"
    );

    if (capturedAtMs > submittedAtMs) {
      throw new Error(
        "Source capture timestamp cannot be later than submission."
      );
    }

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

  const verifiedAtMs = validTimestamp(
    verifiedAt,
    "Verification timestamp"
  );

  if (verifiedAtMs < Date.parse(record.submittedAt)) {
    throw new Error(
      "Verification timestamp cannot be earlier than the preceding event."
    );
  }

  if (reviewerId.trim() === record.submittedBy) {
    throw new Error(
      "The submitter cannot verify their own answer key."
    );
  }

  if (decision !== "verified" && decision !== "rejected") {
    throw new Error("Invalid verification decision.");
  }

  validateDecisionRef(
    decisionRef,
    "Verification decision reference"
  );

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

  const approvedAtMs = validTimestamp(
    approvedAt,
    "Approval timestamp"
  );

  if (
    record.verifiedAt === null ||
    approvedAtMs < Date.parse(record.verifiedAt)
  ) {
    throw new Error(
      "Approval timestamp cannot be earlier than the preceding event."
    );
  }

  if (
    approverId.trim() === record.submittedBy ||
    approverId.trim() === record.verifiedBy
  ) {
    throw new Error(
      "Approval must be performed by an independent approver."
    );
  }

  validateDecisionRef(
    decisionRef,
    "Approval decision reference"
  );

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

  const quarantinedAtMs = validTimestamp(
    quarantinedAt,
    "Quarantine timestamp"
  );

  if (
    record.approvedAt === null ||
    quarantinedAtMs < Date.parse(record.approvedAt)
  ) {
    throw new Error(
      "Quarantine timestamp cannot be earlier than the preceding event."
    );
  }

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

  const revokedAtMs = validTimestamp(
    revokedAt,
    "Revocation timestamp"
  );

  const precedingEventAt =
    record.quarantinedAt ?? record.approvedAt;

  if (
    precedingEventAt === null ||
    revokedAtMs < Date.parse(precedingEventAt)
  ) {
    throw new Error(
      "Revocation timestamp cannot be earlier than the preceding event."
    );
  }

  return copyWith(record, {
    recordStatus: "revoked",
    revokedReason: reason.trim(),
    revokedAt: revokedAt.trim(),
  });
}
