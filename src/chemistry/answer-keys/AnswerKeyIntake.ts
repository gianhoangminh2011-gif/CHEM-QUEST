
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

  quarantineReason: string | null;
  quarantinedAt: string | null;
  revokedReason: string | null;
  revokedAt: string | null;

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

function validTimestamp(value: unknown, label: string): asserts value is string {
  required(value, label);

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid timestamp.`);
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
  required(
    input.questionSnapshotFingerprint,
    "Question snapshot fingerprint"
  );
  required(input.correctChoiceId, "Correct choice ID");
  required(input.submittedBy, "Submitter");
  validTimestamp(input.submittedAt, "Submission timestamp");

  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error("Answer-key version must be a positive integer.");
  }

  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new Error("At least one source reference is required.");
  }

  const sourceIds = new Set<string>();

  for (const source of input.sources) {
    if (!source || typeof source !== "object") {
      throw new Error("Invalid source reference.");
    }

    required(source.sourceId, "Source ID");
    required(source.sourceType, "Source type");
    required(source.locator, "Source locator");
    validTimestamp(source.capturedAt, "Source capture timestamp");
    required(source.contentFingerprint, "Source content fingerprint");

    const sourceId = source.sourceId.trim();

    if (sourceIds.has(sourceId)) {
      throw new Error("Source IDs must be unique.");
    }

    sourceIds.add(sourceId);
  }

  if (input.supersedesAnswerKeyId != null) {
    required(input.supersedesAnswerKeyId, "Superseded answer-key ID");

    if (input.supersedesAnswerKeyId === input.answerKeyId) {
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
      capturedAt: source.capturedAt,
      contentFingerprint: source.contentFingerprint.trim(),
    })),
    submittedBy: input.submittedBy.trim(),
    submittedAt: input.submittedAt,
    version: input.version,
    supersedesAnswerKeyId:
      input.supersedesAnswerKeyId?.trim() ?? null,

    verificationStatus: "pending",
    verifiedBy: null,
    verifiedAt: null,

    approvalStatus: "pending",
    approvedBy: null,
    approvedAt: null,

    quarantineReason: null,
    quarantinedAt: null,
    revokedReason: null,
    revokedAt: null,

    recordStatus: "draft",
  });
}

export function submitAnswerKeyForReview(
  record: AnswerKeyIntakeRecord
): AnswerKeyIntakeRecord {
  if (record.recordStatus !== "draft") {
    throw new Error("Only a draft answer key can be submitted for review.");
  }

  return freezeRecord({
    ...record,
    recordStatus: "in_review",
  });
}

export function verifyAnswerKey(
  record: AnswerKeyIntakeRecord,
  verifier: string,
  verifiedAt: string,
  decision: "verified" | "rejected"
): AnswerKeyIntakeRecord {
  required(verifier, "Verifier");
  validTimestamp(verifiedAt, "Verification timestamp");

  if (record.recordStatus !== "in_review") {
    throw new Error("Only an answer key under review can be verified.");
  }

  if (record.verificationStatus !== "pending") {
    throw new Error("This answer key has already been verified.");
  }

  if (verifier.trim() === record.submittedBy) {
    throw new Error("The submitter cannot verify their own answer key.");
  }

  return freezeRecord({
    ...record,
    verificationStatus: decision,
    verifiedBy: verifier.trim(),
    verifiedAt,
    approvalStatus: decision === "rejected" ? "rejected" : "pending",
    recordStatus: decision === "verified" ? "in_review" : "rejected",
  });
}

export function approveAnswerKey(
  record: AnswerKeyIntakeRecord,
  approver: string,
  approvedAt: string
): AnswerKeyIntakeRecord {
  required(approver, "Approver");
  validTimestamp(approvedAt, "Approval timestamp");

  if (
    record.recordStatus !== "in_review" ||
    record.verificationStatus !== "verified" ||
    !record.verifiedBy
  ) {
    throw new Error("Only a verified answer key can be approved.");
  }

  if (record.approvalStatus !== "pending") {
    throw new Error("This answer key has already received an approval decision.");
  }

  const normalizedApprover = approver.trim();

  if (
    normalizedApprover === record.submittedBy ||
    normalizedApprover === record.verifiedBy
  ) {
    throw new Error("Approval must be performed by an independent approver.");
  }

  return freezeRecord({
    ...record,
    approvalStatus: "approved",
    approvedBy: normalizedApprover,
    approvedAt,
    recordStatus: "complete",
  });
}

export function quarantineAnswerKey(
  record: AnswerKeyIntakeRecord,
  reason: string,
  quarantinedAt: string
): AnswerKeyIntakeRecord {
  required(reason, "Quarantine reason");
  validTimestamp(quarantinedAt, "Quarantine timestamp");

  if (record.recordStatus !== "complete") {
    throw new Error("Only a completed answer key can be quarantined.");
  }

  return freezeRecord({
    ...record,
    quarantineReason: reason.trim(),
    quarantinedAt,
    recordStatus: "quarantined",
  });
}

export function revokeAnswerKey(
  record: AnswerKeyIntakeRecord,
  reason: string,
  revokedAt: string
): AnswerKeyIntakeRecord {
  required(reason, "Revocation reason");
  validTimestamp(revokedAt, "Revocation timestamp");

  if (
    record.recordStatus !== "complete" &&
    record.recordStatus !== "quarantined"
  ) {
    throw new Error(
      "Only a completed or quarantined answer key can be revoked."
    );
  }

  return freezeRecord({
    ...record,
    revokedReason: reason.trim(),
    revokedAt,
    recordStatus: "revoked",
  });
}
