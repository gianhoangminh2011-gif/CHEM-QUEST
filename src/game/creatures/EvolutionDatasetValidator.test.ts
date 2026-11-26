import { describe, expect, it } from "vitest";

import type {
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import {
  validateEvolutionDataset,
} from "./EvolutionDatasetValidator";

function makeSpecies(
  id: string,
  targets: string[] = [],
  requirements: string[] = [],
): SpeciesDefinition {
  return {
    id,
    name: `Species ${id}`,
    group: "CG-01",
    tier: "PHAM_CHUNG",
    status: "DRAFT",
    traits: [],
    compatibility: [],
    evolutionBranches: targets.map((target, index) => ({
      id: `BR-${id}-${String(index + 1).padStart(4, "0")}`,
      targetSpeciesId: target,
      requirements: [...requirements],
    })),
    version: 1,
  };
}

describe("validateEvolutionDataset", () => {
  it("accepts an empty dataset", () => {
    const result = validateEvolutionDataset([]);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects a non-array dataset", () => {
    const result = validateEvolutionDataset({
      id: "SP-0001",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "INVALID_DATASET",
        path: "$",
      }),
    ]);
  });

  it("accepts a valid evolution dataset", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-0002"], [
        "LEVEL>=10",
        "REALM>=KHAI_VAT_CANH",
      ]),
      makeSpecies("SP-0002"),
    ]);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects invalid Species structure", () => {
    const invalidSpecies = {
      ...makeSpecies("SP-0001"),
      name: "",
    };

    const result = validateEvolutionDataset([
      invalidSpecies,
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_NAME",
          path: "[0].name",
        }),
      ]),
    );
  });

  it("stops dependent validation when Species structure is invalid", () => {
    const invalidSpecies = {
      ...makeSpecies("SP-0001", ["SP-9999"]),
      name: "",
    };

    const result = validateEvolutionDataset([
      invalidSpecies,
    ]);

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) => issue.code === "INVALID_NAME",
      ),
    ).toBe(true);

    expect(
      result.issues.some(
        (issue) => issue.code === "UNKNOWN_EVOLUTION_TARGET",
      ),
    ).toBe(false);
  });

  it("rejects duplicate Species IDs", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001"),
      makeSpecies("SP-0001"),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_SPECIES_ID",
        }),
      ]),
    );
  });

  it("rejects unknown evolution targets", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-9999"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_EVOLUTION_TARGET",
        }),
      ]),
    );
  });

  it("rejects self-referencing evolution branches", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-0001"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SELF_EVOLUTION_REFERENCE",
        }),
      ]),
    );
  });

  it("rejects evolution cycles", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-0002"]),
      makeSpecies("SP-0002", ["SP-0001"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EVOLUTION_CYCLE_DETECTED",
        }),
      ]),
    );
  });

  it("rejects malformed evolution requirements", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-0002"], [
        "LEVEL=10",
      ]),
      makeSpecies("SP-0002"),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MALFORMED_REQUIREMENT",
          path: "[0].evolutionBranches[0].requirements[0]",
        }),
      ]),
    );
  });

  it("rejects duplicate normalized requirements", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-0002"], [
        "LEVEL>=10",
        "LEVEL >= 10",
      ]),
      makeSpecies("SP-0002"),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_REQUIREMENT",
        }),
      ]),
    );
  });

  it("aggregates independent graph and requirement issues", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001", ["SP-9999"], [
        "LEVEL=10",
      ]),
    ]);

    expect(result.valid).toBe(false);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_EVOLUTION_TARGET",
        }),
        expect.objectContaining({
          code: "MALFORMED_REQUIREMENT",
        }),
      ]),
    );
  });

  it("returns frozen results and issues", () => {
    const result = validateEvolutionDataset([
      makeSpecies("SP-0001"),
    ]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });

  it("does not mutate the input dataset", () => {
    const dataset = [
      makeSpecies("SP-0001", ["SP-0002"], [
        "LEVEL>=10",
      ]),
      makeSpecies("SP-0002"),
    ];

    const original = JSON.stringify(dataset);

    validateEvolutionDataset(dataset);

    expect(JSON.stringify(dataset)).toBe(original);
  });
});