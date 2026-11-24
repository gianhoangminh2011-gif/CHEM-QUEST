import { describe, expect, it } from "vitest";

import {
  parseChemicalFormula,
  buildCompoundRegistry,
  getApprovedCompoundById,
  getCompoundElementComposition,
  getCompoundReactionIds,
  type ChemicalCompound,
} from "./FormulaCompound";

describe("parseChemicalFormula", () => {
  it.each([
    ["H2O", { H: 2, O: 1 }],
    ["CO2", { C: 1, O: 2 }],
    ["NaCl", { Na: 1, Cl: 1 }],
    ["Ca(OH)2", { Ca: 1, O: 2, H: 2 }],
    ["Al2(SO4)3", { Al: 2, S: 3, O: 12 }],
    ["K4(ON(SO3)2)2", { K: 4, O: 14, N: 2, S: 4 }],
  ])("parses %s", (formula, expected) => {
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(true);

    const actual = Object.fromEntries(
      result.composition.map(({ symbol, count }) => [
        symbol,
        count,
      ]),
    );

    expect(actual).toEqual(expected);
  });

  it.each([
    "",
    "   ",
    "h2o",
    "Xx2",
    "H0",
    "H-2",
    "H2O)",
    "(H2O",
    "()",
    "H2O!",
    "2H2O",
    "H2Xx",
    "H2(",
  ])("rejects invalid formula %s", (formula) => {
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.composition).toHaveLength(0);
  });

  it.each([
    "H2O)",
    "H2O!",
    "H2Xx",
    "H2(",
  ])("returns empty composition for invalid formula: %s", (formula) => {
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(false);
    expect(result.composition).toEqual([]);
  });

  it("rejects unsafe integer counts", () => {
    const result = parseChemicalFormula("H999999999999999999999");

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_SUBSCRIPT",
        }),
      ]),
    );
  });

  it("rejects formulas longer than the maximum length", () => {
    const result = parseChemicalFormula("H".repeat(257));

    expect(result.valid).toBe(false);
    expect(result.composition).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FORMULA_TOO_LONG",
        }),
      ]),
    );
  });

  it("accepts formulas at the maximum length", () => {
    const formula = "H".repeat(256);
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(true);
    expect(result.composition).toEqual([
      expect.objectContaining({
        symbol: "H",
        count: 256,
      }),
    ]);
  });

  it("rejects nesting deeper than the maximum depth", () => {
    const formula = `${"(".repeat(33)}H${")".repeat(33)}`;
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(false);
    expect(result.composition).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NESTING_TOO_DEEP",
        }),
      ]),
    );
  });

  it("accepts nesting at the maximum depth", () => {
    const formula = `${"(".repeat(32)}H${")".repeat(32)}`;
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(true);
    expect(result.composition).toEqual([
      expect.objectContaining({
        symbol: "H",
        count: 1,
      }),
    ]);
  });

  it("returns deeply immutable composition and issues", () => {
    const result = parseChemicalFormula("H2O");

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.composition)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);

    for (const element of result.composition) {
      expect(Object.isFrozen(element)).toBe(true);
    }

    for (const issue of result.issues) {
      expect(Object.isFrozen(issue)).toBe(true);
    }
  });

  it("returns deeply immutable issues for invalid formulas", () => {
    const result = parseChemicalFormula("Xx2");

    expect(result.valid).toBe(false);
    expect(Object.isFrozen(result.issues)).toBe(true);
    expect(Object.isFrozen(result.issues[0])).toBe(true);
    expect(result.composition).toHaveLength(0);
  });

  it("includes atomic numbers from periodic table data", () => {
    const result = parseChemicalFormula("H2O");

    expect(result.composition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "H",
          atomicNumber: 1,
          count: 2,
        }),
        expect.objectContaining({
          symbol: "O",
          atomicNumber: 8,
          count: 1,
        }),
      ]),
    );
  });
});

describe("Compound registry", () => {
  const draftCompound = {
    id: "compound-water",
    name: "Water",
    formula: "H2O",
    status: "DRAFT" as const,
    source: {
      reference: "https://example.org/water",
    },
  };

  const approvedCompound = {
    id: "compound-carbon-dioxide",
    name: "Carbon dioxide",
    formula: "CO2",
    status: "APPROVED" as const,
    source: {
      reference: "https://example.org/carbon-dioxide",
    },
    approvedBy: "reviewer",
    approvalReference: "approval-001",
  };

  it("accepts valid draft compounds", () => {
    const registry = buildCompoundRegistry([draftCompound]);

    expect(registry.valid).toBe(true);
    expect(registry.issues).toHaveLength(0);
  });

  it("does not return draft compounds as approved", () => {
    const registry = buildCompoundRegistry([draftCompound]);

    expect(
      getApprovedCompoundById(registry, "compound-water"),
    ).toBeUndefined();
  });

  it("returns approved compounds", () => {
    const registry = buildCompoundRegistry([approvedCompound]);

    expect(
      getApprovedCompoundById(
        registry,
        "compound-carbon-dioxide",
      ),
    ).toEqual(
      expect.objectContaining({
        id: "compound-carbon-dioxide",
        status: "APPROVED",
      }),
    );
  });

  it("requires approval metadata", () => {
    const invalidApproved = {
      ...approvedCompound,
      approvedBy: "",
      approvalReference: "",
    };

    const registry = buildCompoundRegistry([invalidApproved]);

    expect(registry.valid).toBe(false);
    expect(registry.issues.length).toBeGreaterThan(0);
  });

  it("rejects duplicate IDs", () => {
    const registry = buildCompoundRegistry([
      draftCompound,
      { ...draftCompound, name: "Duplicate" },
    ]);

    expect(registry.valid).toBe(false);
    expect(
      registry.issues.some((issue) =>
        issue.message.includes("Duplicate"),
      ),
    ).toBe(true);
  });

  it("requires source references", () => {
    const invalidCompound = {
      ...draftCompound,
      source: { reference: "" },
    };

    const registry = buildCompoundRegistry([invalidCompound]);

    expect(registry.valid).toBe(false);
  });

  it("rejects invalid formulas in registry", () => {
    const invalidCompound = {
      ...draftCompound,
      formula: "Xx2",
    };

    const registry = buildCompoundRegistry([invalidCompound]);

    expect(registry.valid).toBe(false);
  });

  it("freezes registry data deeply", () => {
    const registry = buildCompoundRegistry([draftCompound]);

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.compounds)).toBe(true);
    expect(Object.isFrozen(registry.compounds[0])).toBe(true);
    expect(Object.isFrozen(registry.compounds[0].source)).toBe(true);
    expect(Object.isFrozen(registry.issues)).toBe(true);
  });

  it("freezes registry issue objects", () => {
    const registry = buildCompoundRegistry([
      draftCompound,
      { ...draftCompound, name: "Duplicate" },
    ]);

    expect(registry.issues.length).toBeGreaterThan(0);

    for (const issue of registry.issues) {
      expect(Object.isFrozen(issue)).toBe(true);
    }
  });

  it("does not expose approved entries from an invalid registry", () => {
    const registry = buildCompoundRegistry([
      approvedCompound,
      { ...draftCompound, id: approvedCompound.id },
    ]);

    expect(registry.valid).toBe(false);

    expect(
      getApprovedCompoundById(
        registry,
        "compound-carbon-dioxide",
      ),
    ).toBeUndefined();
  });
});

describe("Compound registry runtime validation", () => {
  const validDraft: ChemicalCompound = {
    id: "compound-water",
    name: "Water",
    formula: "H2O",
    status: "DRAFT",
    source: {
      reference: "https://example.org/water",
    },
  };

  const validApproved: ChemicalCompound = {
    id: "compound-carbon-dioxide",
    name: "Carbon dioxide",
    formula: "CO2",
    status: "APPROVED",
    source: {
      reference: "https://example.org/carbon-dioxide",
    },
    approvedBy: "reviewer",
    approvalReference: "approval-001",
  };

  it("does not crash when registry input is null", () => {
    const registry = buildCompoundRegistry(
      null as unknown as readonly ChemicalCompound[],
    );

    expect(registry.valid).toBe(false);
    expect(registry.compounds).toHaveLength(0);
    expect(registry.issues.length).toBeGreaterThan(0);
  });

  it("does not crash when registry input is not an array", () => {
    const registry = buildCompoundRegistry(
      {} as unknown as readonly ChemicalCompound[],
    );

    expect(registry.valid).toBe(false);
    expect(registry.compounds).toHaveLength(0);
  });

  it.each([null, undefined, 42, "invalid", true, []])(
    "rejects malformed registry entry: %s",
    (entry) => {
      const registry = buildCompoundRegistry(
        [entry] as unknown as readonly ChemicalCompound[],
      );

      expect(registry.valid).toBe(false);
      expect(registry.issues.length).toBeGreaterThan(0);
    },
  );

  it("rejects missing and malformed compound fields", () => {
    const malformed = {
      id: "INVALID ID",
      name: "",
      formula: 123,
      status: "UNKNOWN",
      source: null,
    };

    const registry = buildCompoundRegistry(
      [malformed] as unknown as readonly ChemicalCompound[],
    );

    expect(registry.valid).toBe(false);
    expect(registry.issues.length).toBeGreaterThanOrEqual(5);
  });

  it("rejects malformed optional source metadata", () => {
    const malformed = {
      ...validDraft,
      source: {
        reference: "https://example.org/water",
        publisher: 123,
        accessedAt: false,
      },
    };

    const registry = buildCompoundRegistry(
      [malformed] as unknown as readonly ChemicalCompound[],
    );

    expect(registry.valid).toBe(false);
    expect(
      registry.issues.some((issue) =>
        issue.message.includes("publisher"),
      ),
    ).toBe(true);
    expect(
      registry.issues.some((issue) =>
        issue.message.includes("accessedAt"),
      ),
    ).toBe(true);
  });

  it("rejects malformed reaction link collections", () => {
    const malformed = {
      ...validDraft,
      reactionIds: "reaction-001",
    };

    const registry = buildCompoundRegistry(
      [malformed] as unknown as readonly ChemicalCompound[],
    );

    expect(registry.valid).toBe(false);
    expect(
      registry.issues.some((issue) =>
        issue.message.includes("reactionIds"),
      ),
    ).toBe(true);
  });

  it("rejects invalid and duplicate reaction identifiers", () => {
    const malformed = {
      ...validDraft,
      reactionIds: [
        "reaction-001",
        "INVALID ID",
        "reaction-001",
      ],
    };

    const registry = buildCompoundRegistry([malformed]);

    expect(registry.valid).toBe(false);
    expect(
      registry.issues.some((issue) =>
        issue.message.includes("Duplicate reaction link"),
      ),
    ).toBe(true);
    expect(
      registry.issues.some((issue) =>
        issue.message.includes("kebab-case"),
      ),
    ).toBe(true);
  });

  it.each([
    "DRAFT",
    "REVIEW_REQUIRED",
    "REJECTED",
  ] as const)(
    "accepts valid %s compounds without approval metadata",
    (status) => {
      const compound = {
        ...validDraft,
        id: `compound-${status.toLowerCase().replace("_", "-")}`,
        status,
      };

      const registry = buildCompoundRegistry([compound]);

      expect(registry.valid).toBe(true);
      expect(
        getApprovedCompoundById(registry, compound.id),
      ).toBeUndefined();
    },
  );

  it("requires approval metadata before accepting APPROVED status", () => {
    const missingApprover = {
      ...validApproved,
      approvedBy: "",
    };

    const missingReference = {
      ...validApproved,
      approvalReference: "",
    };

    expect(
      buildCompoundRegistry([missingApprover]).valid,
    ).toBe(false);

    expect(
      buildCompoundRegistry([missingReference]).valid,
    ).toBe(false);
  });

  it("does not expose approved compounds from a registry containing invalid entries", () => {
    const registry = buildCompoundRegistry(
      [validApproved, null] as unknown as readonly ChemicalCompound[],
    );

    expect(registry.valid).toBe(false);
    expect(
      getApprovedCompoundById(
        registry,
        validApproved.id,
      ),
    ).toBeUndefined();
  });
});

describe("Compound relationships", () => {
  const compound: ChemicalCompound = {
    id: "compound-water",
    name: "Water",
    formula: "H2O",
    status: "DRAFT",
    source: {
      reference: "https://example.org/water",
    },
    reactionIds: ["reaction-water-formation"],
  };

  it("derives element composition from the chemical formula", () => {
    const result = getCompoundElementComposition(compound);

    expect(result.valid).toBe(true);
    expect(result.composition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "H",
          atomicNumber: 1,
          count: 2,
        }),
        expect.objectContaining({
          symbol: "O",
          atomicNumber: 8,
          count: 1,
        }),
      ]),
    );
  });

  it("returns only explicitly declared reaction identifiers", () => {
    expect(getCompoundReactionIds(compound)).toEqual([
      "reaction-water-formation",
    ]);
  });

  it("does not infer reaction identifiers from a formula", () => {
    const compoundWithoutLinks: ChemicalCompound = {
      ...compound,
      reactionIds: undefined,
    };

    expect(
      getCompoundReactionIds(compoundWithoutLinks),
    ).toEqual([]);
  });

  it("ignores malformed reaction identifiers at read time", () => {
    const malformed = {
      ...compound,
      reactionIds: [
        "reaction-valid",
        "INVALID ID",
        123,
      ],
    };

    expect(
      getCompoundReactionIds(
        malformed as unknown as ChemicalCompound,
      ),
    ).toEqual(["reaction-valid"]);
  });

  it("returns an invalid formula result for malformed compound input", () => {
    const malformed = {
      id: "compound-invalid",
      formula: 123,
    };

    const result = getCompoundElementComposition(
      malformed as unknown as ChemicalCompound,
    );

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.composition).toHaveLength(0);
  });
});