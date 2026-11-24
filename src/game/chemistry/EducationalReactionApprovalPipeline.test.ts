import { describe, expect, it } from "vitest";

import {
  type EducationalReaction,
  type EducationalReactionSource,
  buildEducationalReactionRegistry,
} from "./EducationalReaction";

import {
  getApprovedEducationalReactions,
  transitionEducationalReaction,
} from "./EducationalReactionApprovalPipeline";

const source: EducationalReactionSource = {
  title: "Chemistry reference",
  publisher: "Example Academic Publisher",
  url: "https://example.org/chemistry",
  locator: "Section 1",
  accessedAt: "2026-11-24",
  supports: [
    "REACTANTS_PRODUCTS",
    "STOICHIOMETRY",
  ],
};

function createReaction(
  status: EducationalReaction["status"] = "DRAFT",
): EducationalReaction {
  return {
    id: "hydrogen-formation",
    name: "Formation of water",
    reactants: [
      { formula: "H2", coefficient: 2 },
      { formula: "O2", coefficient: 1 },
    ],
    products: [
      { formula: "H2O", coefficient: 2 },
    ],
    sources: [source],
    status,
  };
}

describe("Educational reaction approval pipeline", () => {
  it("submits a valid DRAFT reaction for review", () => {
    const result = transitionEducationalReaction(
      createReaction("DRAFT"),
      { type: "SUBMIT_FOR_REVIEW" },
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.reaction.status).toBe("REVIEW_REQUIRED");
    expect(result.record).toEqual({
      reactionId: "hydrogen-formation",
      action: "SUBMITTED_FOR_REVIEW",
      fromStatus: "DRAFT",
      toStatus: "REVIEW_REQUIRED",
    });
  });

  it("does not modify the original reaction", () => {
    const original = createReaction("DRAFT");

    const result = transitionEducationalReaction(
      original,
      { type: "SUBMIT_FOR_REVIEW" },
    );

    expect(result.success).toBe(true);
    expect(original.status).toBe("DRAFT");
  });

  it("does not allow submitting a REVIEW_REQUIRED reaction again", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      { type: "SUBMIT_FOR_REVIEW" },
    );

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_TRANSITION",
    });
  });

  it("does not approve a DRAFT reaction directly", () => {
    const result = transitionEducationalReaction(
      createReaction("DRAFT"),
      {
        type: "APPROVE",
        approvedBy: "reviewer",
        approvalReference: "APPROVAL-001",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_TRANSITION",
    });
  });

  it("approves a REVIEW_REQUIRED reaction with explicit metadata", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "APPROVE",
        approvedBy: "chemistry-reviewer",
        approvalReference: "PD-APPROVAL-001",
      },
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.reaction).toMatchObject({
      status: "APPROVED",
      approvedBy: "chemistry-reviewer",
      approvalReference: "PD-APPROVAL-001",
    });

    expect(result.record).toMatchObject({
      action: "APPROVED",
      fromStatus: "REVIEW_REQUIRED",
      toStatus: "APPROVED",
      reviewer: "chemistry-reviewer",
      reference: "PD-APPROVAL-001",
    });
  });

  it("rejects approval when reviewer is missing", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "APPROVE",
        approvedBy: " ",
        approvalReference: "APPROVAL-001",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "MISSING_REVIEWER",
    });
  });

  it("rejects approval when approval reference is missing", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "APPROVE",
        approvedBy: "reviewer",
        approvalReference: " ",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "MISSING_REFERENCE",
    });
  });

  it("rejects a REVIEW_REQUIRED reaction with an explicit reason", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "REJECT",
        reviewedBy: "chemistry-reviewer",
        reviewReference: "PD-REVIEW-002",
        reason: "Source evidence is insufficient.",
      },
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.reaction.status).toBe("REJECTED");

    expect(result.record).toMatchObject({
      action: "REJECTED",
      fromStatus: "REVIEW_REQUIRED",
      toStatus: "REJECTED",
      reviewer: "chemistry-reviewer",
      reference: "PD-REVIEW-002",
      reason: "Source evidence is insufficient.",
    });
  });

  it("requires a reviewer when rejecting", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "REJECT",
        reviewedBy: " ",
        reviewReference: "PD-REVIEW-002",
        reason: "Insufficient evidence.",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "MISSING_REVIEWER",
    });
  });

  it("requires a reference when rejecting", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "REJECT",
        reviewedBy: "reviewer",
        reviewReference: " ",
        reason: "Insufficient evidence.",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "MISSING_REFERENCE",
    });
  });

  it("requires a rejection reason", () => {
    const result = transitionEducationalReaction(
      createReaction("REVIEW_REQUIRED"),
      {
        type: "REJECT",
        reviewedBy: "reviewer",
        reviewReference: "PD-REVIEW-002",
        reason: " ",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "MISSING_REJECTION_REASON",
    });
  });

  it("does not allow approving an already rejected reaction", () => {
    const result = transitionEducationalReaction(
      createReaction("REJECTED"),
      {
        type: "APPROVE",
        approvedBy: "reviewer",
        approvalReference: "APPROVAL-001",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_TRANSITION",
    });
  });

  it("does not allow approving an already approved reaction again", () => {
    const approved: EducationalReaction = {
      ...createReaction("REVIEW_REQUIRED"),
      status: "APPROVED",
      approvedBy: "reviewer",
      approvalReference: "APPROVAL-001",
    };

    const result = transitionEducationalReaction(
      approved,
      {
        type: "APPROVE",
        approvedBy: "another-reviewer",
        approvalReference: "APPROVAL-002",
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_TRANSITION",
    });
  });

  it("rejects invalid reaction data before transition", () => {
    const invalid: EducationalReaction = {
      ...createReaction("DRAFT"),
      products: [
        { formula: "H2O", coefficient: 1 },
      ],
    };

    const result = transitionEducationalReaction(
      invalid,
      { type: "SUBMIT_FOR_REVIEW" },
    );

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_REACTION",
    });
  });

  it("returns no approved reactions from a REVIEW_REQUIRED registry", () => {
    const registry = buildEducationalReactionRegistry([
      createReaction("REVIEW_REQUIRED"),
    ]);

    expect(registry.valid).toBe(true);
    expect(getApprovedEducationalReactions(registry)).toHaveLength(0);
  });

  it("returns only approved reactions from a valid registry", () => {
    const approved: EducationalReaction = {
      ...createReaction("REVIEW_REQUIRED"),
      status: "APPROVED",
      approvedBy: "reviewer",
      approvalReference: "APPROVAL-001",
    };

    const registry = buildEducationalReactionRegistry([
      approved,
      {
        ...createReaction("REVIEW_REQUIRED"),
        id: "another-candidate",
      },
    ]);

    expect(registry.valid).toBe(true);

    const result = getApprovedEducationalReactions(registry);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("hydrogen-formation");
    expect(result[0].status).toBe("APPROVED");
  });

  it("returns no approved reactions from an invalid registry", () => {
    const invalid: EducationalReaction = {
      ...createReaction("REVIEW_REQUIRED"),
      products: [
        { formula: "H2O", coefficient: 1 },
      ],
    };

    const registry = buildEducationalReactionRegistry([
      invalid,
    ]);

    expect(registry.valid).toBe(false);
    expect(getApprovedEducationalReactions(registry)).toHaveLength(0);
  });

  it("freezes the decision record", () => {
    const result = transitionEducationalReaction(
      createReaction("DRAFT"),
      { type: "SUBMIT_FOR_REVIEW" },
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.record)).toBe(true);
  });
});