import { describe, expect, it } from "vitest";

import type {
  CreatureProfile,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import {
  createEvolutionExecutionTransaction,
  type EvolutionExecutionTransactionInput,
} from "./EvolutionExecutionTransaction";

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
  version: 3,
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
  overrides: Partial<EvolutionExecutionTransactionInput> = {},
): EvolutionExecutionTransactionInput {
  return {
    expectedProfileVersion: 3,
    coordinatorInput: {
      requestId: "REQ-0001",
      profile,
      species,
      branchId: "BR-0001",
      evaluationContext,
      processedRequestIds: [],
    },
    ...overrides,
  };
}

describe("createEvolutionExecutionTransaction", () => {
  it("creates a transaction plan when coordinator is READY", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput(),
    );

    expect(result.decision).toBe("TRANSACTION_PLANNED");
    expect(result.transactionPlanned).toBe(true);
    expect(result.evolutionExecuted).toBe(false);
    expect(result.plan).not.toBeNull();
    expect(result.plan).toMatchObject({
      requestId: "REQ-0001",
      creatureId: "CR-0001",
      profileVersion: 3,
      expectedProfileVersion: 3,
      sourceSpeciesId: "SP-0001",
      targetSpeciesId: "SP-0002",
      branchId: "BR-0001",
      itemCostsToConsume: [
        { itemId: "ITEM-001", quantity: 2 },
      ],
    });
    expect(result.issues).toHaveLength(0);
  });

  it("rejects when the coordinator is not READY", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          evaluationContext: {
            ...evaluationContext,
            level: 1,
          },
        },
      }),
    );

    expect(result.decision).toBe("REQUIREMENTS_NOT_MET");
    expect(result.transactionPlanned).toBe(false);
    expect(result.plan).toBeNull();
  });

  it("rejects a duplicate request", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          processedRequestIds: ["REQ-0001"],
        },
      }),
    );

    expect(result.decision).toBe("REJECTED_DUPLICATE_REQUEST");
    expect(result.plan).toBeNull();
  });

  it("rejects an invalid request before planning", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          requestId: "invalid request",
        },
      }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.transactionPlanned).toBe(false);
    expect(result.plan).toBeNull();
  });

  it("rejects a Creature Profile version mismatch", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        expectedProfileVersion: 2,
      }),
    );

    expect(result.decision).toBe(
      "REJECTED_PROFILE_VERSION_MISMATCH",
    );
    expect(result.plan).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROFILE_VERSION_MISMATCH",
        }),
      ]),
    );
  });

  it("rejects an invalid expected profile version", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        expectedProfileVersion: 0,
      }),
    );

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(result.plan).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_TRANSACTION_INPUT",
        }),
      ]),
    );
  });

  it("rejects an invalid evolution branch", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          branchId: "BR-9999",
        },
      }),
    );

    expect(result.decision).toBe("REJECTED_NOT_READY");
    expect(result.plan).toBeNull();
  });

  it("rejects insufficient item quantity", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          evaluationContext: {
            ...evaluationContext,
            inventory: [
              { itemId: "ITEM-001", quantity: 1 },
            ],
          },
        },
      }),
    );

    expect(result.decision).toBe("REQUIREMENTS_NOT_MET");
    expect(result.plan).toBeNull();
  });

  it("aggregates multiple item requirements for the same item", () => {
    const customSpecies: SpeciesDefinition[] = [
      {
        ...sourceSpecies,
        evolutionBranches: [
          {
            id: "BR-0001",
            targetSpeciesId: "SP-0002",
            requirements: [
              "LEVEL>=10",
              "ITEM:ITEM-001>=2",
              "ITEM:ITEM-001>=3",
            ],
          },
        ],
      },
      targetSpecies,
    ];

    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          species: customSpecies,
          evaluationContext: {
            ...evaluationContext,
            inventory: [
              { itemId: "ITEM-001", quantity: 5 },
            ],
          },
        },
      }),
    );

    expect(result.decision).toBe("TRANSACTION_PLANNED");
    expect(result.plan?.itemCostsToConsume).toEqual([
      { itemId: "ITEM-001", quantity: 5 },
    ]);
  });

  it("rejects insufficient aggregate item cost without a partial plan", () => {
    const customSpecies: SpeciesDefinition[] = [
      {
        ...sourceSpecies,
        evolutionBranches: [
          {
            id: "BR-0001",
            targetSpeciesId: "SP-0002",
            requirements: [
              "LEVEL>=10",
              "ITEM:ITEM-001>=2",
              "ITEM:ITEM-001>=3",
            ],
          },
        ],
      },
      targetSpecies,
    ];

    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          species: customSpecies,
          evaluationContext: {
            ...evaluationContext,
            inventory: [
              { itemId: "ITEM-001", quantity: 4 },
            ],
          },
        },
      }),
    );

    expect(result.transactionPlanned).toBe(false);
    expect(result.plan).toBeNull();
  });

  it("does not mutate profile, species, context, or processed IDs", () => {
    const input = makeInput();

    const before = {
      profile: JSON.stringify(input.coordinatorInput.profile),
      species: JSON.stringify(input.coordinatorInput.species),
      context: JSON.stringify(
        input.coordinatorInput.evaluationContext,
      ),
      processed: JSON.stringify(
        input.coordinatorInput.processedRequestIds,
      ),
    };

    createEvolutionExecutionTransaction(input);

    expect(JSON.stringify(input.coordinatorInput.profile)).toBe(
      before.profile,
    );
    expect(JSON.stringify(input.coordinatorInput.species)).toBe(
      before.species,
    );
    expect(
      JSON.stringify(input.coordinatorInput.evaluationContext),
    ).toBe(before.context);
    expect(
      JSON.stringify(input.coordinatorInput.processedRequestIds),
    ).toBe(before.processed);
  });

  it("returns an immutable plan and immutable nested collections", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput(),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(
      Object.isFrozen(result.plan?.itemCostsToConsume),
    ).toBe(true);
    expect(
      Object.isFrozen(result.plan?.evaluations),
    ).toBe(true);
    expect(
      Object.isFrozen(result.plan?.itemCostsToConsume[0]),
    ).toBe(true);
  });

  it("never reports that evolution was executed", () => {
    const ready = createEvolutionExecutionTransaction(
      makeInput(),
    );

    const rejected = createEvolutionExecutionTransaction(
      makeInput({
        expectedProfileVersion: 1,
      }),
    );

    expect(ready.evolutionExecuted).toBe(false);
    expect(rejected.evolutionExecuted).toBe(false);
  });

  it("does not create a plan when any requirement is unmet", () => {
    const result = createEvolutionExecutionTransaction(
      makeInput({
        coordinatorInput: {
          ...makeInput().coordinatorInput,
          evaluationContext: {
            ...evaluationContext,
            completedQuestIds: [],
          },
        },
      }),
    );

    expect(result.decision).toBe("REQUIREMENTS_NOT_MET");
    expect(result.transactionPlanned).toBe(false);
    expect(result.plan).toBeNull();
  });
});