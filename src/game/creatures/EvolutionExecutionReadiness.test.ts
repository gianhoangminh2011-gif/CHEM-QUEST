
import { describe, expect, it } from "vitest";

import type {
  CreatureProfile,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import {
  validateEvolutionExecutionReadiness,
} from "./EvolutionExecutionReadiness";

const profile: CreatureProfile = {
  id: "CR-0001",
  speciesId: "SP-0001",
  cultivationRealm: "KHAI_VAT_CANH",
  awakeningStage: "SO_TINH",
  evolutionStage: "KHOI_SINH",
  talents: [],
  affinities: [],
  abilities: [],
  createdAt: "2026-11-25T10:00:00.000Z",
  updatedAt: "2026-11-25T10:00:00.000Z",
  version: 1,
};

const sourceSpecies: SpeciesDefinition = {
  id: "SP-0001",
  name: "Source Species",
  group: "CG-01",
  tier: "PHAM_CHUNG",
  status: "ACTIVE",
  traits: [],
  compatibility: [],
  evolutionBranches: [
    {
      id: "BR-0001",
      targetSpeciesId: "SP-0002",
      requirements: ["LEVEL>=10"],
    },
  ],
  version: 1,
};

const targetSpecies: SpeciesDefinition = {
  id: "SP-0002",
  name: "Target Species",
  group: "CG-01",
  tier: "LINH_CHUNG",
  status: "APPROVED",
  traits: [],
  compatibility: [],
  evolutionBranches: [],
  version: 1,
};

const dataset = [sourceSpecies, targetSpecies];

describe("validateEvolutionExecutionReadiness", () => {
  it("accepts a structurally ready evolution proposal", () => {
    const result = validateEvolutionExecutionReadiness(
      profile,
      dataset,
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts an ACTIVE target Species", () => {
    const activeTarget = {
      ...targetSpecies,
      status: "ACTIVE" as const,
    };

    const result = validateEvolutionExecutionReadiness(
      profile,
      [sourceSpecies, activeTarget],
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(true);
  });

  it("rejects an invalid Creature Profile", () => {
    const result = validateEvolutionExecutionReadiness(
      { ...profile, id: "" },
      dataset,
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_ID",
          path: "profile.id",
        }),
      ]),
    );
  });

  it("rejects an invalid Species dataset", () => {
    const result = validateEvolutionExecutionReadiness(
      profile,
      [{ ...sourceSpecies, name: "" }, targetSpecies],
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_NAME",
        }),
      ]),
    );
  });

  it("rejects an empty branch ID", () => {
    const result = validateEvolutionExecutionReadiness(
      profile,
      dataset,
      "",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_BRANCH_ID",
        }),
      ]),
    );
  });

  it("rejects a missing branch", () => {
    const result = validateEvolutionExecutionReadiness(
      profile,
      dataset,
      "BR-9999",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EVOLUTION_BRANCH_NOT_FOUND",
        }),
      ]),
    );
  });

  it("rejects a source Species that is not ACTIVE", () => {
    const inactiveSource = {
      ...sourceSpecies,
      status: "APPROVED" as const,
    };

    const result = validateEvolutionExecutionReadiness(
      profile,
      [inactiveSource, targetSpecies],
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SOURCE_SPECIES_NOT_ACTIVE",
        }),
      ]),
    );
  });

  it("rejects a target Species that is not approved", () => {
    const draftTarget = {
      ...targetSpecies,
      status: "DRAFT" as const,
    };

    const result = validateEvolutionExecutionReadiness(
      profile,
      [sourceSpecies, draftTarget],
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "TARGET_SPECIES_NOT_APPROVED",
        }),
      ]),
    );
  });

  it("rejects a profile referencing an unknown source Species", () => {
    const result = validateEvolutionExecutionReadiness(
      { ...profile, speciesId: "SP-9999" },
      dataset,
      "BR-0001",
    );

    expect(result.readyForEvaluation).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_SOURCE_SPECIES",
        }),
      ]),
    );
  });

  it("does not evaluate requirements or execute evolution", () => {
    const result = validateEvolutionExecutionReadiness(
      profile,
      dataset,
      "BR-0001",
    );

    expect(result.requirementsEvaluated).toBe(false);
    expect(result.evolutionExecuted).toBe(false);
  });

  it("returns immutable results", () => {
    const result = validateEvolutionExecutionReadiness(
      profile,
      dataset,
      "BR-0001",
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });

  it("does not mutate the input", () => {
    const originalProfile = JSON.stringify(profile);
    const originalDataset = JSON.stringify(dataset);

    validateEvolutionExecutionReadiness(
      profile,
      dataset,
      "BR-0001",
    );

    expect(JSON.stringify(profile)).toBe(originalProfile);
    expect(JSON.stringify(dataset)).toBe(originalDataset);
  });
});
