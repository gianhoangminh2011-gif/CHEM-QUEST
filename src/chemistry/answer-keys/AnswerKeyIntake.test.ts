
import { describe, expect, it } from "vitest";
import {
  approveAnswerKey,
  createAnswerKeyIntake,
  quarantineAnswerKey,
  revokeAnswerKey,
  submitAnswerKeyForReview,
  verifyAnswerKey,
} from "./AnswerKeyIntake";

function createDraft() {
  return createAnswerKeyIntake({
    answerKeyId: "AK-001",
    questionId: "Q-001",
    questionVersion: "1.0",
    questionSnapshotFingerprint: "sha256-question-001",
    correctChoiceId: "A",
    sources: [
      {
        sourceId: "SRC-001",
        sourceType: "reference",
        locator: "Test fixture only",
        capturedAt: "2026-11-17T10:00:00Z",
        contentFingerprint: "sha256-source-001",
      },
    ],
    submittedBy: "author-001",
    submittedAt: "2026-11-17T10:05:00Z",
    version: 1,
  });
}

function createVerifiedRecord() {
  const submitted = submitAnswerKeyForReview(createDraft());

  return verifyAnswerKey(
    submitted,
    "reviewer-001",
    "2026-11-17T11:00:00Z",
    "verified"
  );
}

function createApprovedRecord() {
  return approveAnswerKey(
    createVerifiedRecord(),
    "approver-001",
    "2026-11-17T12:00:00Z"
  );
}

describe("AnswerKeyIntake", () => {
  it("creates a draft with pending statuses", () => {
    const record = createDraft();

    expect(record.recordStatus).toBe("draft");
    expect(record.verificationStatus).toBe("pending");
    expect(record.approvalStatus).toBe("pending");
    expect(record.verifiedBy).toBeNull();
    expect(record.approvedBy).toBeNull();
  });

  it("rejects an empty source list", () => {
    expect(() =>
      createAnswerKeyIntake({
        ...createDraft(),
        sources: [],
      })
    ).toThrow("At least one source reference is required.");
  });

  it("rejects an invalid version", () => {
    expect(() =>
      createAnswerKeyIntake({
        ...createDraft(),
        version: 0,
      })
    ).toThrow("Answer-key version must be a positive integer.");
  });

  it("rejects invalid timestamps", () => {
    expect(() =>
      createAnswerKeyIntake({
        ...createDraft(),
        submittedAt: "not-a-date",
      })
    ).toThrow("Submission timestamp must be a valid timestamp.");
  });

  it("rejects duplicate source IDs", () => {
    const draft = createDraft();

    expect(() =>
      createAnswerKeyIntake({
        ...draft,
        sources: [
          ...draft.sources,
          { ...draft.sources[0] },
        ],
      })
    ).toThrow("Source IDs must be unique.");
  });

  it("rejects self-supersession", () => {
    expect(() =>
      createAnswerKeyIntake({
        ...createDraft(),
        supersedesAnswerKeyId: "AK-001",
      })
    ).toThrow("An answer key cannot supersede itself.");
  });

  it("submits a draft for review", () => {
    expect(
      submitAnswerKeyForReview(createDraft()).recordStatus
    ).toBe("in_review");
  });

  it("rejects submitting a record twice", () => {
    const submitted = submitAnswerKeyForReview(createDraft());

    expect(() =>
      submitAnswerKeyForReview(submitted)
    ).toThrow("Only a draft answer key can be submitted for review.");
  });

  it("rejects verification by the submitter", () => {
    const submitted = submitAnswerKeyForReview(createDraft());

    expect(() =>
      verifyAnswerKey(
        submitted,
        "author-001",
        "2026-11-17T11:00:00Z",
        "verified"
      )
    ).toThrow("The submitter cannot verify their own answer key.");
  });

  it("allows independent verification", () => {
    const record = createVerifiedRecord();

    expect(record.verificationStatus).toBe("verified");
    expect(record.verifiedBy).toBe("reviewer-001");
    expect(record.recordStatus).toBe("in_review");
  });

  it("rejects repeated verification", () => {
    const record = createVerifiedRecord();

    expect(() =>
      verifyAnswerKey(
        record,
        "reviewer-002",
        "2026-11-17T11:30:00Z",
        "verified"
      )
    ).toThrow("This answer key has already been verified.");
  });

  it("rejects approval before verification", () => {
    const submitted = submitAnswerKeyForReview(createDraft());

    expect(() =>
      approveAnswerKey(
        submitted,
        "approver-001",
        "2026-11-17T12:00:00Z"
      )
    ).toThrow("Only a verified answer key can be approved.");
  });

  it("rejects approval by the submitter", () => {
    expect(() =>
      approveAnswerKey(
        createVerifiedRecord(),
        "author-001",
        "2026-11-17T12:00:00Z"
      )
    ).toThrow("Approval must be performed by an independent approver.");
  });

  it("rejects approval by the verifier", () => {
    expect(() =>
      approveAnswerKey(
        createVerifiedRecord(),
        "reviewer-001",
        "2026-11-17T12:00:00Z"
      )
    ).toThrow("Approval must be performed by an independent approver.");
  });

  it("completes independent verification and approval", () => {
    const record = createApprovedRecord();

    expect(record.recordStatus).toBe("complete");
    expect(record.approvalStatus).toBe("approved");
    expect(record.approvedBy).toBe("approver-001");
  });

  it("preserves the verification rejection decision", () => {
    const submitted = submitAnswerKeyForReview(createDraft());

    const rejected = verifyAnswerKey(
      submitted,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "rejected"
    );

    expect(rejected.recordStatus).toBe("rejected");
    expect(rejected.verificationStatus).toBe("rejected");
    expect(rejected.approvalStatus).toBe("rejected");
  });

  it("stores quarantine reason and timestamp", () => {
    const quarantined = quarantineAnswerKey(
      createApprovedRecord(),
      "Source requires re-review.",
      "2026-11-17T13:00:00Z"
    );

    expect(quarantined.recordStatus).toBe("quarantined");
    expect(quarantined.quarantineReason).toBe(
      "Source requires re-review."
    );
    expect(quarantined.quarantinedAt).toBe(
      "2026-11-17T13:00:00Z"
    );
  });

  it("stores revocation reason and timestamp", () => {
    const revoked = revokeAnswerKey(
      createApprovedRecord(),
      "Source was invalidated.",
      "2026-11-17T14:00:00Z"
    );

    expect(revoked.recordStatus).toBe("revoked");
    expect(revoked.revokedReason).toBe(
      "Source was invalidated."
    );
    expect(revoked.revokedAt).toBe(
      "2026-11-17T14:00:00Z"
    );
  });

  it("rejects quarantine of an unapproved record", () => {
    expect(() =>
      quarantineAnswerKey(
        createVerifiedRecord(),
        "Needs review.",
        "2026-11-17T13:00:00Z"
      )
    ).toThrow("Only a completed answer key can be quarantined.");
  });

  it("rejects revocation of a draft", () => {
    expect(() =>
      revokeAnswerKey(
        createDraft(),
        "Invalid source.",
        "2026-11-17T14:00:00Z"
      )
    ).toThrow(
      "Only a completed or quarantined answer key can be revoked."
    );
  });

  it("keeps records immutable", () => {
    const record = createDraft();
    const submitted = submitAnswerKeyForReview(record);

    expect(record.recordStatus).toBe("draft");
    expect(submitted.recordStatus).toBe("in_review");
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.sources)).toBe(true);
  });
});
