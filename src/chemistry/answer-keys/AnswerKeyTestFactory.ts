import {
  approveAnswerKey,
  createAnswerKeyIntake,
  submitAnswerKeyForReview,
  verifyAnswerKey,
} from "./AnswerKeyIntake";

import type {
  AnswerKeyIntakeRecord,
} from "./AnswerKeyIntake";

/**
 * Creates synthetic, fully approved answer-key records
 * for automated tests only.
 *
 * This factory must never be used for production question content.
 */
export function createApprovedTestAnswerKey(
  questionId = "Q-001",
  correctChoiceId = "A",
  questionVersion = "v1",
  questionSnapshotFingerprint = "fingerprint-001",
  answerKeyId = "AK-Q-001",
  version = 1
): AnswerKeyIntakeRecord {
  const submitted = createAnswerKeyIntake({
    answerKeyId,
    questionId,
    questionVersion,
    questionSnapshotFingerprint,
    correctChoiceId,
    sources: [
      {
        sourceId: `TEST-SOURCE-${answerKeyId}`,
        sourceType: "test_fixture",
        locator: "synthetic://chem-quest/test-fixture",
        capturedAt: "2026-01-01T08:00:00.000Z",
        contentFingerprint: `TEST-FINGERPRINT-${answerKeyId}`,
      },
    ],
    submittedBy: "test-submitter",
    submittedAt: "2026-01-01T09:00:00.000Z",
    version,
  });

  const submittedForReview =
    submitAnswerKeyForReview(submitted);

  const verified = verifyAnswerKey(
    submittedForReview,
    "test-verifier",
    "2026-01-01T10:00:00.000Z",
    "verified",
    `TEST-VERIFY-${answerKeyId}`
  );

  return approveAnswerKey(
    verified,
    "test-approver",
    "2026-01-01T11:00:00.000Z",
    `TEST-APPROVE-${answerKeyId}`
  );
}