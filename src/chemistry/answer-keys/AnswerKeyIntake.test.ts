
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
        sourceType: "teacher-approved-reference",
        locator: "Chemistry reference, chapter 1",
        capturedAt: "2026-11-17T10:00:00Z",
        contentFingerprint: "sha256-source-001",
      },
    ],
    submittedBy: "author-001",
    submittedAt: "2026-11-17T10:05:00Z",
    version: 1,
  });
}

describe("AnswerKeyIntake", () => {
  it("creates a draft with pending review statuses", () => {
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

  it("submits a draft for review", () => {
    const record = submitAnswerKeyForReview(createDraft());

    expect(record.recordStatus).toBe("in_review");
  });

  it("rejects verification by the original submitter", () => {
    const record = submitAnswerKeyForReview(createDraft());

    expect(() =>
      verifyAnswerKey(
        record,
        "author-001",
        "2026-11-17T11:00:00Z",
        "verified"
      )
    ).toThrow("The submitter cannot verify their own answer key.");
  });

  it("allows an independent verifier to verify", () => {
    const record = submitAnswerKeyForReview(createDraft());

    const verified = verifyAnswerKey(
      record,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "verified"
    );

    expect(verified.verificationStatus).toBe("verified");
    expect(verified.verifiedBy).toBe("reviewer-001");
    expect(verified.recordStatus).toBe("in_review");
  });

  it("rejects approval before verification", () => {
    const record = submitAnswerKeyForReview(createDraft());

    expect(() =>
      approveAnswerKey(
        record,
        "approver-001",
        "2026-11-17T12:00:00Z"
      )
    ).toThrow("Only a verified answer key can be approved.");
  });

  it("rejects approval by the submitter", () => {
    const submitted = submitAnswerKeyForReview(createDraft());
    const verified = verifyAnswerKey(
      submitted,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "verified"
    );

    expect(() =>
      approveAnswerKey(
        verified,
        "author-001",
        "2026-11-17T12:00:00Z"
      )
    ).toThrow("Approval must be performed by an independent approver.");
  });

  it("rejects approval by the verifier", () => {
    const submitted = submitAnswerKeyForReview(createDraft());
    const verified = verifyAnswerKey(
      submitted,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "verified"
    );

    expect(() =>
      approveAnswerKey(
        verified,
        "reviewer-001",
        "2026-11-17T12:00:00Z"
      )
    ).toThrow("Approval must be performed by an independent approver.");
  });

  it("completes the independent verification and approval flow", () => {
    const submitted = submitAnswerKeyForReview(createDraft());
    const verified = verifyAnswerKey(
      submitted,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "verified"
    );
    const approved = approveAnswerKey(
      verified,
      "approver-001",
      "2026-11-17T12:00:00Z"
    );

    expect(approved.recordStatus).toBe("complete");
    expect(approved.approvalStatus).toBe("approved");
    expect(approved.approvedBy).toBe("approver-001");
  });

  it("rejects an answer key after verification review", () => {
    const submitted = submitAnswerKeyForReview(createDraft());
    const rejected = verifyAnswerKey(
      submitted,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "rejected"
    );

    expect(rejected.recordStatus).toBe("rejected");
    expect(rejected.verificationStatus).toBe("rejected");
  });

  it("supports quarantine and revocation of a completed record", () => {
    const submitted = submitAnswerKeyForReview(createDraft());
    const verified = verifyAnswerKey(
      submitted,
      "reviewer-001",
      "2026-11-17T11:00:00Z",
      "verified"
    );
    const approved = approveAnswerKey(
      verified,
      "approver-001",
      "2026-11-17T12:00:00Z"
    );

    const quarantined = quarantineAnswerKey(
      approved,
      "Source requires re-review."
    );

    expect(quarantined.recordStatus).toBe("quarantined");

    const revoked = revokeAnswerKey(
      quarantined,
      "Source was invalidated."
    );

    expect(revoked.recordStatus).toBe("revoked");
  });
});
