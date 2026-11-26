
import { describe, expect, it } from "vitest";

import type {
  CreatureProfile,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import {
  coordinateEvolutionExecution,
  type EvolutionExecutionCoordinatorInput,
} from "./EvolutionExecutionCoordinator";

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
      requirements: [
        "LEVEL>=10",
        "ITEM:ITEM-001>=2",
        "QUEST:QUEST-001=COMPLETED",
      ],
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

const species = [sourceSpecies, targetSpecies];

const evaluationContext = {
  level: 15,
  cultivationRealm: "NGUYEN_TO_CANH" as const,
  inventory: [
    { itemId: "ITEM-001", quantity: 5 },
  ],
  completedQuestIds: ["QUEST-001"],
  affinities: [],
};

function makeInput(
  overrides: Partial<EvolutionExecutionCoordinatorInput> = {},
): EvolutionExecutionCoordinatorInput {
  return {
    requestId: "REQ-0001",
    profile,
    species,
    branchId: "BR-0001",
    evaluationContext,
    processedRequestIds: [],
    ...overrides,
  };
}

describe("coordinateEvolutionExecution", () => {
  it("returns READY_FOR_EXECUTION when readiness and requirements pass", () => {
    const result = coordinateEvolutionExecution(
      makeInput(),
    );

    expect(result.decision).toBe("READY_FOR_EXECUTION");
    expect(result.approvedForExecution).toBe(true);
    expect(result.requirementsMet).toBe(true);
    expect(result.readinessChecked).toBe(true);
    expect(result.requirementsEvaluated).toBe(true);
    expect(result.evolutionExecuted).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects an invalid request ID", () => {
    const result = coordinateEvolutionExecution(
      makeInput({ requestId: "invalid id" }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_REQUEST_ID",
          path: "requestId",
        }),
      ]),
    );
  });

  it("rejects an invalid branch ID", () => {
    const result = coordinateEvolutionExecution(
      makeInput({ branchId: "" }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_BRANCH_ID",
        }),
      ]),
    );
  });

  it("rejects a request ID already in the processed snapshot", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        processedRequestIds: ["REQ-0001"],
      }),
    );

    expect(result.decision).toBe(
      "REJECTED_DUPLICATE_REQUEST",
    );
    expect(result.approvedForExecution).toBe(false);
    expect(result.requirementsEvaluated).toBe(false);
    expect(result.evolutionExecuted).toBe(false);
  });

  it("rejects duplicate IDs inside the processed request snapshot", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        processedRequestIds: [
          "REQ-0002",
          "REQ-0002",
        ],
      }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_PROCESSED_REQUEST_ID",
        }),
      ]),
    );
  });

  it("rejects an invalid Creature Profile", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        profile: {
          ...profile,
          id: "",
        },
      }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.approvedForExecution).toBe(false);
  });

  it("rejects when readiness validation fails", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        branchId: "BR-9999",
      }),
    );

    expect(result.decision).toBe("REJECTED_NOT_READY");
    expect(result.readinessChecked).toBe(true);
    expect(result.requirementsEvaluated).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EVOLUTION_BRANCH_NOT_FOUND",
        }),
      ]),
    );
  });

  it("rejects when evolution requirements are not met", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        evaluationContext: {
          ...evaluationContext,
          level: 5,
          inventory: [],
          completedQuestIds: [],
        },
      }),
    );

    expect(result.decision).toBe("REQUIREMENTS_NOT_MET");
    expect(result.approvedForExecution).toBe(false);
    expect(result.requirementsMet).toBe(false);
    expect(result.requirementsEvaluated).toBe(true);
    expect(result.evaluations).toHaveLength(3);
  });

  it("rejects invalid evaluation context", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        evaluationContext: {
          ...evaluationContext,
          level: 0,
        },
      }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.requirementsEvaluated).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_LEVEL",
        }),
      ]),
    );
  });

  it("does not evaluate requirements if readiness fails", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        branchId: "BR-9999",
        evaluationContext: undefined,
      }),
    );

    expect(result.decision).toBe("REJECTED_NOT_READY");
    expect(result.requirementsEvaluated).toBe(false);
  });

  it("does not mutate the input profile, dataset, or context", () => {
    const input = makeInput();

    const originalProfile = JSON.stringify(input.profile);
    const originalSpecies = JSON.stringify(input.species);
    const originalContext = JSON.stringify(
      input.evaluationContext,
    );
    const originalProcessedIds = JSON.stringify(
      input.processedRequestIds,
    );

    coordinateEvolutionExecution(input);

    expect(JSON.stringify(input.profile)).toBe(originalProfile);
    expect(JSON.stringify(input.species)).toBe(originalSpecies);
    expect(JSON.stringify(input.evaluationContext)).toBe(
      originalContext,
    );
    expect(JSON.stringify(input.processedRequestIds)).toBe(
      originalProcessedIds,
    );
  });

  it("returns immutable result objects and collections", () => {
    const result = coordinateEvolutionExecution(
      makeInput(),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evaluations)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);

    if (result.evaluations.length > 0) {
      expect(Object.isFrozen(result.evaluations[0])).toBe(true);
    }
  });

  it("never reports that evolution was executed", () => {
    const ready = coordinateEvolutionExecution(
      makeInput(),
    );

    const rejected = coordinateEvolutionExecution(
      makeInput({
        branchId: "BR-9999",
      }),
    );

    expect(ready.evolutionExecuted).toBe(false);
    expect(rejected.evolutionExecuted).toBe(false);
  });

  it("does not approve execution when any requirement fails", () => {
    const result = coordinateEvolutionExecution(
      makeInput({
        evaluationContext: {
          ...evaluationContext,
          level: 1,
        },
      }),
    );

    expect(result.approvedForExecution).toBe(false);
    expect(result.decision).toBe("REQUIREMENTS_NOT_MET");
  });
});
