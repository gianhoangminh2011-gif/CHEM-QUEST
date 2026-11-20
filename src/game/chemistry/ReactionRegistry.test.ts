
import { describe, expect, it } from "vitest";
import type { ReactionDefinition } from "./ReactionEngine";
import {
  buildReactionRegistry,
  getApprovedReactionById,
  REACTION_REGISTRY_ENTRIES,
  type ReactionRegistryEntry,
} from "./ReactionRegistry";

describe("ReactionRegistry", () => {
  const validReaction: ReactionDefinition = {
    id: "test-reaction",
    inputs: [{ resourceId: "crystal-water", quantity: 2 }],
    outputs: [{ resourceId: "crystal-hydrogen", quantity: 1 }],
  };

  const approvedEntry: ReactionRegistryEntry = {
    reaction: validReaction,
    sourceReference: "verified-test-source",
    approvalStatus: "APPROVED",
    approvedBy: "test-reviewer",
    approvalReference: "approval-test-001",
  };

  it("starts with an empty production registry", () => {
    expect(REACTION_REGISTRY_ENTRIES).toEqual([]);
    expect(Object.isFrozen(REACTION_REGISTRY_ENTRIES)).toBe(true);
  });

  it("builds a valid registry entry", () => {
    const result = buildReactionRegistry([approvedEntry]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].reaction.id).toBe("test-reaction");
    }
  });

  it("rejects duplicate reaction IDs", () => {
    const result = buildReactionRegistry([
      approvedEntry,
      approvedEntry,
    ]);

    expect(result).toMatchObject({
      success: false,
      error: "DUPLICATE_REACTION_ID",
    });
  });

  it("rejects invalid reaction IDs", () => {
    const entry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        id: "invalid reaction",
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_REACTION_ID",
    });
  });

  it("rejects empty input materials", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        inputs: [],
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_MATERIAL",
    });
  });

  it("rejects empty output materials", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        outputs: [],
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_MATERIAL",
    });
  });

  it("rejects resource IDs outside the crystal namespace", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        inputs: [{ resourceId: "water", quantity: 1 }],
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_MATERIAL_ID",
    });
  });

  it("rejects invalid material quantities", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        inputs: [{ resourceId: "crystal-water", quantity: 0 }],
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_QUANTITY",
    });
  });

  it("rejects duplicate input resource IDs", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        inputs: [
          { resourceId: "crystal-water", quantity: 1 },
          { resourceId: "crystal-water", quantity: 2 },
        ],
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "DUPLICATE_RESOURCE",
    });
  });

  it("rejects duplicate output resource IDs", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        outputs: [
          { resourceId: "crystal-hydrogen", quantity: 1 },
          { resourceId: "crystal-hydrogen", quantity: 2 },
        ],
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "DUPLICATE_RESOURCE",
    });
  });

  it("requires a source reference", () => {
    const entry: ReactionRegistryEntry = {
      ...approvedEntry,
      sourceReference: " ",
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_SOURCE_REFERENCE",
    });
  });

  it("rejects unknown approval statuses", () => {
    const entry = {
      ...approvedEntry,
      approvalStatus: "UNKNOWN",
    } as unknown as ReactionRegistryEntry;

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_APPROVAL_STATUS",
    });
  });

  it("requires approval metadata for approved entries", () => {
    const entry: ReactionRegistryEntry = {
      reaction: validReaction,
      sourceReference: "verified-test-source",
      approvalStatus: "APPROVED",
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "MISSING_APPROVAL_METADATA",
    });
  });

  it("does not expose unapproved reactions through approved lookup", () => {
    const draftEntry: ReactionRegistryEntry = {
      reaction: validReaction,
      sourceReference: "draft-source",
      approvalStatus: "DRAFT",
    };

    const result = buildReactionRegistry([draftEntry]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(
        getApprovedReactionById("test-reaction", result.entries),
      ).toBeUndefined();
    }
  });

  it("returns approved reactions through lookup", () => {
    const result = buildReactionRegistry([approvedEntry]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(
        getApprovedReactionById("test-reaction", result.entries),
      ).toEqual(validReaction);
    }
  });

  it("returns immutable registry entries", () => {
    const result = buildReactionRegistry([approvedEntry]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(Object.isFrozen(result.entries)).toBe(true);
      expect(Object.isFrozen(result.entries[0])).toBe(true);
      expect(Object.isFrozen(result.entries[0].reaction)).toBe(true);
      expect(
        Object.isFrozen(result.entries[0].reaction.inputs),
      ).toBe(true);
      expect(
        Object.isFrozen(result.entries[0].reaction.inputs[0]),
      ).toBe(true);
    }
  });

  it("rejects prototype-related reaction IDs", () => {
    const entry = {
      ...approvedEntry,
      reaction: {
        ...validReaction,
        id: "__proto__",
      },
    };

    expect(buildReactionRegistry([entry])).toMatchObject({
      success: false,
      error: "INVALID_REACTION_ID",
    });
  });

  it("does not return a production reaction for an unknown ID", () => {
    expect(getApprovedReactionById("unknown-reaction")).toBeUndefined();
  });
});
