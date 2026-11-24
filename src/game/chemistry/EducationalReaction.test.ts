import { describe, expect, it } from "vitest";

import {
  buildEducationalReactionRegistry,
  getApprovedEducationalReactionById,
  type EducationalReaction,
} from "./EducationalReaction";

import {
  EDUCATIONAL_REACTION_CANDIDATES,
  EDUCATIONAL_REACTION_REGISTRY,
} from "./EducationalReactionDataset";

const validSource = {
  title: "Chemistry reference",
  publisher: "Example Academic Publisher",
  url: "https://example.org/chemistry",
  locator: "Section 1",
  accessedAt: "2026-11-24",
};

const validReaction: EducationalReaction = {
  id: "hydrogen-formation",
  name: "Formation of water",
  reactants: [
    { formula: "H2", coefficient: 2 },
    { formula: "O2", coefficient: 1 },
  ],
  products: [
    { formula: "H2O", coefficient: 2 },
  ],
  sources: [validSource],
  status: "REVIEW_REQUIRED",
};

describe("Educational reaction dataset", () => {
  it("contains candidate reactions", () => {
    expect(EDUCATIONAL_REACTION_CANDIDATES.length).toBeGreaterThan(0);
  });

  it("keeps candidate reactions in REVIEW_REQUIRED status", () => {
    expect(
      EDUCATIONAL_REACTION_CANDIDATES.every(
        (reaction) => reaction.status === "REVIEW_REQUIRED",
      ),
    ).toBe(true);
  });

  it("builds a valid candidate registry", () => {
    expect(EDUCATIONAL_REACTION_REGISTRY.valid).toBe(true);
    expect(EDUCATIONAL_REACTION_REGISTRY.issues).toHaveLength(0);
  });
});

describe("Educational reaction registry", () => {
  it("accepts a balanced reaction", () => {
    const registry = buildEducationalReactionRegistry([validReaction]);

    expect(registry.valid).toBe(true);
    expect(registry.issues).toHaveLength(0);
  });

  it("rejects an atom-imbalanced reaction", () => {
    const invalidReaction: EducationalReaction = {
      ...validReaction,
      products: [{ formula: "H2O", coefficient: 1 }],
    };

    const registry = buildEducationalReactionRegistry([invalidReaction]);

    expect(registry.valid).toBe(false);
    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ATOM_IMBALANCE" }),
      ]),
    );
  });

  it("rejects an unknown element symbol", () => {
    const invalidReaction: EducationalReaction = {
      ...validReaction,
      reactants: [{ formula: "Xx2", coefficient: 1 }],
    };

    const registry = buildEducationalReactionRegistry([invalidReaction]);

    expect(registry.valid).toBe(false);
    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_FORMULA" }),
      ]),
    );
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid coefficient %s",
    (coefficient) => {
      const invalidReaction: EducationalReaction = {
        ...validReaction,
        reactants: [{ formula: "H2", coefficient }],
      };

      const registry = buildEducationalReactionRegistry([invalidReaction]);

      expect(registry.valid).toBe(false);
      expect(registry.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_COEFFICIENT" }),
        ]),
      );
    },
  );

  it("rejects duplicate species on the same side", () => {
    const invalidReaction: EducationalReaction = {
      ...validReaction,
      reactants: [
        { formula: "H2", coefficient: 1 },
        { formula: "H2", coefficient: 1 },
        { formula: "O2", coefficient: 1 },
      ],
    };

    const registry = buildEducationalReactionRegistry([invalidReaction]);

    expect(registry.valid).toBe(false);
    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_SPECIES" }),
      ]),
    );
  });

  it("requires at least one source", () => {
    const invalidReaction: EducationalReaction = {
      ...validReaction,
      sources: [],
    };

    const registry = buildEducationalReactionRegistry([invalidReaction]);

    expect(registry.valid).toBe(false);
    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_SOURCE" }),
      ]),
    );
  });

  it("requires HTTPS source URLs", () => {
    const invalidReaction: EducationalReaction = {
      ...validReaction,
      sources: [{ ...validSource, url: "http://example.org" }],
    };

    const registry = buildEducationalReactionRegistry([invalidReaction]);

    expect(registry.valid).toBe(false);
  });

  it("rejects duplicate reaction IDs", () => {
    const registry = buildEducationalReactionRegistry([
      validReaction,
      { ...validReaction, name: "Duplicate reaction" },
    ]);

    expect(registry.valid).toBe(false);
    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ID" }),
      ]),
    );
  });

  it("requires approval metadata for APPROVED reactions", () => {
    const invalidReaction: EducationalReaction = {
      ...validReaction,
      status: "APPROVED",
    };

    const registry = buildEducationalReactionRegistry([invalidReaction]);

    expect(registry.valid).toBe(false);
    expect(registry.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_APPROVAL_METADATA",
        }),
      ]),
    );
  });

  it("does not return REVIEW_REQUIRED reactions as approved", () => {
    const registry = buildEducationalReactionRegistry([validReaction]);

    expect(
      getApprovedEducationalReactionById(
        registry,
        validReaction.id,
      ),
    ).toBeUndefined();
  });

  it("returns a reaction only when it is approved with metadata", () => {
    const approvedReaction: EducationalReaction = {
      ...validReaction,
      status: "APPROVED",
      approvedBy: "chemistry-reviewer",
      approvalReference: "PD-APPROVAL-001",
    };

    const registry = buildEducationalReactionRegistry([
      approvedReaction,
    ]);

    expect(registry.valid).toBe(true);
    expect(
      getApprovedEducationalReactionById(
        registry,
        approvedReaction.id,
      ),
    ).toEqual(
      expect.objectContaining({
        id: approvedReaction.id,
        status: "APPROVED",
      }),
    );
  });

  it("freezes registry data deeply", () => {
    const registry = buildEducationalReactionRegistry([validReaction]);

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.reactions)).toBe(true);
    expect(Object.isFrozen(registry.reactions[0])).toBe(true);
    expect(Object.isFrozen(registry.reactions[0].reactants)).toBe(true);
    expect(Object.isFrozen(registry.reactions[0].reactants[0])).toBe(true);
    expect(Object.isFrozen(registry.reactions[0].sources)).toBe(true);
    expect(Object.isFrozen(registry.reactions[0].sources[0])).toBe(true);
    expect(Object.isFrozen(registry.issues)).toBe(true);
  });
});