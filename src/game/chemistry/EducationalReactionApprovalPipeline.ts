import {
  buildEducationalReactionRegistry,
  type EducationalReaction,
  type EducationalReactionRegistry,
} from "./EducationalReaction";

export type EducationalReactionDecision =
  | Readonly<{ type: "SUBMIT_FOR_REVIEW" }>
  | Readonly<{
      type: "APPROVE";
      approvedBy: string;
      approvalReference: string;
    }>
  | Readonly<{
      type: "REJECT";
      reviewedBy: string;
      reviewReference: string;
      reason: string;
    }>;

export type EducationalReactionDecisionRecord =
  | Readonly<{
      reactionId: string;
      action: "SUBMITTED_FOR_REVIEW";
      fromStatus: "DRAFT";
      toStatus: "REVIEW_REQUIRED";
    }>
  | Readonly<{
      reactionId: string;
      action: "APPROVED";
      fromStatus: "REVIEW_REQUIRED";
      toStatus: "APPROVED";
      reviewer: string;
      reference: string;
    }>
  | Readonly<{
      reactionId: string;
      action: "REJECTED";
      fromStatus: "REVIEW_REQUIRED";
      toStatus: "REJECTED";
      reviewer: string;
      reference: string;
      reason: string;
    }>;

export type EducationalReactionApprovalErrorCode =
  | "INVALID_REACTION"
  | "INVALID_DECISION"
  | "INVALID_TRANSITION"
  | "MISSING_REVIEWER"
  | "MISSING_REFERENCE"
  | "MISSING_REJECTION_REASON";

export type EducationalReactionApprovalResult =
  | Readonly<{
      success: true;
      reaction: EducationalReaction;
      record: EducationalReactionDecisionRecord;
    }>
  | Readonly<{
      success: false;
      error: EducationalReactionApprovalErrorCode;
      message: string;
    }>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function failure(
  error: EducationalReactionApprovalErrorCode,
  message: string,
): EducationalReactionApprovalResult {
  return Object.freeze({ success: false, error, message });
}

function success(
  reaction: EducationalReaction,
  record: EducationalReactionDecisionRecord,
): EducationalReactionApprovalResult {
  return Object.freeze({
    success: true,
    reaction,
    record: Object.freeze(record),
  });
}

export function transitionEducationalReaction(
  reaction: EducationalReaction,
  decision: EducationalReactionDecision,
): EducationalReactionApprovalResult {
  if (
    !reaction ||
    typeof reaction !== "object" ||
    !decision ||
    typeof decision !== "object"
  ) {
    return failure(
      "INVALID_REACTION",
      "A valid reaction and decision are required.",
    );
  }

  const initialRegistry =
    buildEducationalReactionRegistry([reaction]);

  if (
    !initialRegistry.valid ||
    initialRegistry.reactions.length !== 1
  ) {
    return failure(
      "INVALID_REACTION",
      "Reaction data must pass registry validation before review.",
    );
  }

  const current = initialRegistry.reactions[0];

  switch (decision.type) {
    case "SUBMIT_FOR_REVIEW": {
      if (current.status !== "DRAFT") {
        return failure(
          "INVALID_TRANSITION",
          "Only DRAFT reactions can be submitted for review.",
        );
      }

      const nextReaction: EducationalReaction = {
        ...current,
        status: "REVIEW_REQUIRED",
      };

      const registry =
        buildEducationalReactionRegistry([nextReaction]);

      if (!registry.valid) {
        return failure(
          "INVALID_REACTION",
          "Reaction failed validation after submission.",
        );
      }

      return success(registry.reactions[0], {
        reactionId: current.id,
        action: "SUBMITTED_FOR_REVIEW",
        fromStatus: "DRAFT",
        toStatus: "REVIEW_REQUIRED",
      });
    }

    case "APPROVE": {
      if (current.status !== "REVIEW_REQUIRED") {
        return failure(
          "INVALID_TRANSITION",
          "Only REVIEW_REQUIRED reactions can be approved.",
        );
      }

      if (!isNonEmptyString(decision.approvedBy)) {
        return failure(
          "MISSING_REVIEWER",
          "An approving reviewer is required.",
        );
      }

      if (!isNonEmptyString(decision.approvalReference)) {
        return failure(
          "MISSING_REFERENCE",
          "An approval reference is required.",
        );
      }

      const nextReaction: EducationalReaction = {
        ...current,
        status: "APPROVED",
        approvedBy: decision.approvedBy.trim(),
        approvalReference: decision.approvalReference.trim(),
      };

      const registry =
        buildEducationalReactionRegistry([nextReaction]);

      if (!registry.valid) {
        return failure(
          "INVALID_REACTION",
          "Approved reaction failed registry validation.",
        );
      }

      return success(registry.reactions[0], {
        reactionId: current.id,
        action: "APPROVED",
        fromStatus: "REVIEW_REQUIRED",
        toStatus: "APPROVED",
        reviewer: decision.approvedBy.trim(),
        reference: decision.approvalReference.trim(),
      });
    }

    case "REJECT": {
      if (current.status !== "REVIEW_REQUIRED") {
        return failure(
          "INVALID_TRANSITION",
          "Only REVIEW_REQUIRED reactions can be rejected.",
        );
      }

      if (!isNonEmptyString(decision.reviewedBy)) {
        return failure(
          "MISSING_REVIEWER",
          "A rejecting reviewer is required.",
        );
      }

      if (!isNonEmptyString(decision.reviewReference)) {
        return failure(
          "MISSING_REFERENCE",
          "A rejection reference is required.",
        );
      }

      if (!isNonEmptyString(decision.reason)) {
        return failure(
          "MISSING_REJECTION_REASON",
          "A rejection reason is required.",
        );
      }

      const nextReaction: EducationalReaction = {
        ...current,
        status: "REJECTED",
      };

      const registry =
        buildEducationalReactionRegistry([nextReaction]);

      if (!registry.valid) {
        return failure(
          "INVALID_REACTION",
          "Rejected reaction failed registry validation.",
        );
      }

      return success(registry.reactions[0], {
        reactionId: current.id,
        action: "REJECTED",
        fromStatus: "REVIEW_REQUIRED",
        toStatus: "REJECTED",
        reviewer: decision.reviewedBy.trim(),
        reference: decision.reviewReference.trim(),
        reason: decision.reason.trim(),
      });
    }

    default:
      return failure(
        "INVALID_DECISION",
        "Unsupported reaction review decision.",
      );
  }
}

export function getApprovedEducationalReactions(
  registry: EducationalReactionRegistry,
): readonly EducationalReaction[] {
  if (
    !registry ||
    registry.valid !== true ||
    !Array.isArray(registry.reactions)
  ) {
    return Object.freeze([]);
  }

  // Revalidate instead of trusting a caller-controlled valid flag.
  const validated = buildEducationalReactionRegistry(
    registry.reactions,
  );

  if (!validated.valid || validated.issues.length > 0) {
    return Object.freeze([]);
  }

  return Object.freeze(
    validated.reactions.filter(
      (reaction) => reaction.status === "APPROVED",
    ),
  );
}