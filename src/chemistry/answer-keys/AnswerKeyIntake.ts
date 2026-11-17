export type AnswerKeyStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "VERIFIED"
  | "APPROVED"
  | "QUARANTINED"
  | "REVOKED";

export interface AnswerKeySource {
  sourceId: string;
  sourceType: string;
  reference: string;
  fingerprint: string;
}

export interface AnswerKeyIntakeInput {
  answerKeyId: string;
  subjectId: string;
  topicId: string;
  version: number;
  status: AnswerKeyStatus;
  answers: Record<string, string>;
  sources: AnswerKeySource[];
  submittedBy: string;
  submittedAt: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  supersedesAnswerKeyId?: string | null;
}

export interface AnswerKeyIntakeRecord {
  answerKeyId: string;
  subjectId: string;
  topicId: string;
  version: number;
  status: AnswerKeyStatus;
  answers: Readonly<Record<string, string>>;
  sources: readonly Readonly<AnswerKeySource>[];
  submittedBy: string;
  submittedAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  supersedesAnswerKeyId: string | null;
}

function required(value: string, field: string): void {
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
  input: AnswerKeyIntakeInput
): AnswerKeyIntakeRecord {
  const answers = Object.freeze({ ...input.answers });

  const sources = Object.freeze(
    input.sources.map((source) =>
      Object.freeze({
        sourceId: source.sourceId.trim(),
        sourceType: source.sourceType.trim(),
        reference: source.reference.trim(),
        fingerprint: source.fingerprint.trim(),
      })
    )
  );

  return Object.freeze({
    answerKeyId: input.answerKeyId.trim(),
    subjectId: input.subjectId.trim(),
    topicId: input.topicId.trim(),
    version: input.version,
    status: input.status,
    answers,
    sources,
    submittedBy: input.submittedBy.trim(),
    submittedAt: input.submittedAt.trim(),
    verifiedBy: input.verifiedBy?.trim() || null,
    verifiedAt: input.verifiedAt?.trim() || null,
    approvedBy: input.approvedBy?.trim() || null,
    approvedAt: input.approvedAt?.trim() || null,
    supersedesAnswerKeyId:
      input.supersedesAnswerKeyId?.trim() || null,
  });
}

export function createAnswerKeyIntake(
  input: AnswerKeyIntakeInput
): AnswerKeyIntakeRecord {
  required(input.answerKeyId, "Answer-key ID");
  required(input.subjectId, "Subject ID");
  required(input.topicId, "Topic ID");
  required(input.submittedBy, "Submitter");
  validTimestamp(input.submittedAt, "Submission timestamp");

  if (!Number.isInteger(input.version) || input.version <= 0) {
    throw new Error("Answer-key version must be a positive integer.");
  }

  if (!["DRAFT", "SUBMITTED", "VERIFIED", "APPROVED", "QUARANTINED", "REVOKED"].includes(input.status)) {
    throw new Error("Invalid answer-key status.");
  }

  if (!input.answers || typeof input.answers !== "object") {
    throw new Error("Answer-key answers are required.");
  }

  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new Error("At least one answer-key source is required.");
  }

  const sourceIds = new Set<string>();

  for (const source of input.sources) {
    required(source.sourceId, "Source ID");
    required(source.sourceType, "Source type");
    required(source.reference, "Source reference");
    required(source.fingerprint, "Source fingerprint");

    const normalizedSourceId = source.sourceId.trim();

    if (sourceIds.has(normalizedSourceId)) {
      throw new Error("Duplicate answer-key source ID.");
    }

    sourceIds.add(normalizedSourceId);
  }

  if (input.supersedesAnswerKeyId != null) {
    required(input.supersedesAnswerKeyId, "Superseded answer-key ID");

    // Compare normalized IDs to prevent whitespace bypass.
    if (
      input.supersedesAnswerKeyId.trim() === input.answerKeyId.trim()
    ) {
      throw new Error("An answer key cannot supersede itself.");
    }
  }

  if (input.status === "VERIFIED" || input.status === "APPROVED") {
    required(input.verifiedBy ?? "", "Verifier");
    validTimestamp(input.verifiedAt ?? "", "Verification timestamp");

    if (input.verifiedBy?.trim() === input.submittedBy.trim()) {
      throw new Error("Verifier must be independent from submitter.");
    }
  }

  if (input.status === "APPROVED") {
    required(input.approvedBy ?? "", "Approver");
    validTimestamp(input.approvedAt ?? "", "Approval timestamp");

    if (input.approvedBy?.trim() === input.submittedBy.trim()) {
      throw new Error("Approver must be independent from submitter.");
    }

    if (input.approvedBy?.trim() === input.verifiedBy?.trim()) {
      throw new Error("Approver must be independent from verifier.");
    }
  }

  return freezeRecord(input);
}