import { describe, expect, it } from "vitest";

import {
  parseChemicalFormula,
  buildCompoundRegistry,
  getApprovedCompoundById,
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
  ])("rejects invalid formula %s", (formula) => {
    const result = parseChemicalFormula(formula);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
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

    // Repeated H symbols are valid and are combined into one count.
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