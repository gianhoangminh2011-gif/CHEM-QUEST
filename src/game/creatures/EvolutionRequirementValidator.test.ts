
import { describe, expect, it } from "vitest";

import type {
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import {
  validateEvolutionRequirements,
} from "./EvolutionRequirementValidator";

function makeSpecies(
  id: string,
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
    evolutionBranches: [
      {
        id: `BR-${id}-001`,
        targetSpeciesId: "SP-0002",
        requirements,
      },
    ],
    version: 1,
  };
}

describe("validateEvolutionRequirements", () => {
  it("accepts an empty Species collection", () => {
    const result = validateEvolutionRequirements([]);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts a branch without requirements", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001"),
    ]);

    expect(result.valid).toBe(true);
  });

  it("accepts all supported requirement formats", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "LEVEL>=10",
        "REALM>=KHAI_VAT_CANH",
        "ITEM:ITEM-001>=2",
        "QUEST:QUEST-001=COMPLETED",
        "AFFINITY:ELEMENT-001>=TUONG_HOP",
      ]),
    ]);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts whitespace around operators", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "LEVEL >= 10",
        "ITEM:ITEM-001 >= 2",
        "QUEST:QUEST-001 = COMPLETED",
      ]),
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects an empty requirement", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [""]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe("EMPTY_REQUIREMENT");
  });

  it("rejects whitespace-only requirements", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["   "]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe("EMPTY_REQUIREMENT");
  });

  it("rejects unsupported requirement types", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["GOLD>=100"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "UNKNOWN_REQUIREMENT_TYPE",
    );
  });

  it("rejects malformed requirement syntax", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["LEVEL=10"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "MALFORMED_REQUIREMENT",
    );
  });

  it("rejects zero LEVEL values", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["LEVEL>=0"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_VALUE",
    );
  });

  it("rejects unsafe integer LEVEL values", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "LEVEL>=9007199254740992",
      ]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_VALUE",
    );
  });

  it("rejects unknown cultivation realms", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["REALM>=UNKNOWN_REALM"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_VALUE",
    );
  });

  it("rejects invalid item identifiers", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["ITEM:X>=2"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "MALFORMED_REQUIREMENT",
    );
  });

  it("rejects zero item quantities", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["ITEM:ITEM-001>=0"]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_VALUE",
    );
  });

  it("rejects unsupported quest statuses", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "QUEST:QUEST-001=IN_PROGRESS",
      ]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_VALUE",
    );
  });

  it("rejects unknown affinity levels", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "AFFINITY:ELEMENT-001>=UNKNOWN",
      ]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_VALUE",
    );
  });

  it("detects duplicate requirements after normalization", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "LEVEL>=10",
        "LEVEL >= 10",
      ]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_REQUIREMENT",
          path: "[0].evolutionBranches[0].requirements[1]",
        }),
      ]),
    );
  });

  it("allows the same requirement in different branches", () => {
    const species: SpeciesDefinition = {
      ...makeSpecies("SP-0001"),
      evolutionBranches: [
        {
          id: "BR-SP-0001-A",
          targetSpeciesId: "SP-0002",
          requirements: ["LEVEL>=10"],
        },
        {
          id: "BR-SP-0001-B",
          targetSpeciesId: "SP-0003",
          requirements: ["LEVEL>=10"],
        },
      ],
    };

    const result = validateEvolutionRequirements([
      species,
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects non-array requirements", () => {
    const species = {
      ...makeSpecies("SP-0001"),
      evolutionBranches: [
        {
          id: "BR-SP-0001-001",
          targetSpeciesId: "SP-0002",
          requirements: "LEVEL>=10",
        },
      ],
    } as unknown as SpeciesDefinition;

    const result = validateEvolutionRequirements([
      species,
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENTS_ARRAY",
    );
  });

  it("reports non-string requirement entries", () => {
    const species = {
      ...makeSpecies("SP-0001"),
      evolutionBranches: [
        {
          id: "BR-SP-0001-001",
          targetSpeciesId: "SP-0002",
          requirements: [10],
        },
      ],
    } as unknown as SpeciesDefinition;

    const result = validateEvolutionRequirements([
      species,
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe(
      "INVALID_REQUIREMENT_TYPE",
    );
  });

  it("returns frozen results and issues", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", ["LEVEL>=10"]),
    ]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });

  it("does not mutate the input", () => {
    const species = [
      makeSpecies("SP-0001", [
        "LEVEL>=10",
        "ITEM:ITEM-001>=2",
      ]),
    ];

    const original = JSON.stringify(species);

    validateEvolutionRequirements(species);

    expect(JSON.stringify(species)).toBe(original);
  });

  it("reports paths for multiple invalid requirements", () => {
    const result = validateEvolutionRequirements([
      makeSpecies("SP-0001", [
        "LEVEL=10",
        "GOLD>=100",
      ]),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].path).toBe(
      "[0].evolutionBranches[0].requirements[0]",
    );
    expect(result.issues[1].path).toBe(
      "[0].evolutionBranches[0].requirements[1]",
    );
  });
});
