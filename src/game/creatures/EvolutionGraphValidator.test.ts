
import { describe, expect, it } from "vitest";

import type { SpeciesDefinition } from "./CreatureRealmContracts";
import { validateEvolutionGraph } from "./EvolutionGraphValidator";

function makeSpecies(
  id: string,
  targets: string[] = [],
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
      requirements: [],
    })),
    version: 1,
  };
}

describe("validateEvolutionGraph", () => {
  it("accepts an empty graph", () => {
    const result = validateEvolutionGraph([]);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts a valid linear evolution graph", () => {
    const result = validateEvolutionGraph([
      makeSpecies("SP-0001", ["SP-0002"]),
      makeSpecies("SP-0002", ["SP-0003"]),
      makeSpecies("SP-0003"),
    ]);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts multiple branches from one Species", () => {
    const result = validateEvolutionGraph([
      makeSpecies("SP-0001", ["SP-0002", "SP-0003"]),
      makeSpecies("SP-0002"),
      makeSpecies("SP-0003"),
    ]);

    expect(result.valid).toBe(true);
  });

  it("accepts a converging evolution graph", () => {
    const result = validateEvolutionGraph([
      makeSpecies("SP-0001", ["SP-0003"]),
      makeSpecies("SP-0002", ["SP-0003"]),
      makeSpecies("SP-0003"),
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects duplicate Species IDs", () => {
    const result = validateEvolutionGraph([
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
    const result = validateEvolutionGraph([
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
    const result = validateEvolutionGraph([
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

  it("rejects duplicate branch IDs across Species", () => {
    const first = makeSpecies("SP-0001", ["SP-0003"]);
    const second = makeSpecies("SP-0002", ["SP-0003"]);

    const result = validateEvolutionGraph([
      first,
      {
        ...second,
        evolutionBranches: [
          {
            ...second.evolutionBranches[0],
            id: first.evolutionBranches[0].id,
          },
        ],
      },
      makeSpecies("SP-0003"),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_EVOLUTION_BRANCH_ID",
        }),
      ]),
    );
  });

  it("rejects a two-node evolution cycle", () => {
    const result = validateEvolutionGraph([
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

  it("rejects a longer evolution cycle", () => {
    const result = validateEvolutionGraph([
      makeSpecies("SP-0001", ["SP-0002"]),
      makeSpecies("SP-0002", ["SP-0003"]),
      makeSpecies("SP-0003", ["SP-0004"]),
      makeSpecies("SP-0004", ["SP-0001"]),
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

  it("rejects a cycle inside a graph with valid independent branches", () => {
    const result = validateEvolutionGraph([
      makeSpecies("SP-0001", ["SP-0002"]),
      makeSpecies("SP-0002", ["SP-0001"]),
      makeSpecies("SP-0003", ["SP-0004"]),
      makeSpecies("SP-0004"),
    ]);

    expect(result.valid).toBe(false);
    expect(
      result.issues.filter(
        (issue) => issue.code === "EVOLUTION_CYCLE_DETECTED",
      ),
    ).toHaveLength(1);
  });

  it("returns frozen validation results", () => {
    const result = validateEvolutionGraph([
      makeSpecies("SP-0001"),
    ]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });

  it("does not mutate the input graph", () => {
    const graph = [
      makeSpecies("SP-0001", ["SP-0002"]),
      makeSpecies("SP-0002"),
    ];

    const original = JSON.stringify(graph);

    validateEvolutionGraph(graph);

    expect(JSON.stringify(graph)).toBe(original);
  });
});
