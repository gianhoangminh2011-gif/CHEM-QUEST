
import { describe, expect, it } from "vitest";

import type {
  CreatureProfile,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import { SpeciesCatalogue } from "./SpeciesCatalogue";

import {
  createEvolutionExecutionTransaction,
  type EvolutionExecutionTransactionPlan,
} from "./EvolutionExecutionTransaction";

import {
  EvolutionExecutionAtomicStore,
  type EvolutionExecutionRuntimeContext,
} from "./EvolutionExecutionAtomicStore";

const profile: CreatureProfile = {
  id: "CR-001",
  speciesId: "SP-001",
  cultivationRealm: "NGUYEN_TO_CANH",
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
  id: "SP-001",
  name: "Source Species",
  group: "CG-01",
  tier: "PHAM_CHUNG",
  status: "ACTIVE",
  traits: [],
  compatibility: [],
  evolutionBranches: [
    {
      id: "BR-001",
      targetSpeciesId: "SP-002",
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
  id: "SP-002",
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

const runtimeContext: EvolutionExecutionRuntimeContext = {
  level: 15,
  completedQuestIds: ["QUEST-001"],
  affinities: [],
};

const planningContext = {
  level: 15,
  cultivationRealm: "NGUYEN_TO_CANH" as const,
  inventory: [
    {
      itemId: "ITEM-001",
      quantity: 5,
    },
  ],
  completedQuestIds: ["QUEST-001"],
  affinities: [],
};

function makePlan(): EvolutionExecutionTransactionPlan {
  const result = createEvolutionExecutionTransaction({
    expectedProfileVersion: profile.version,
    coordinatorInput: {
      requestId: "REQ-001",
      profile,
      species,
      branchId: "BR-001",
      evaluationContext: planningContext,
      processedRequestIds: [],
    },
  });

  if (!result.plan) {
    throw new Error(
      `Could not create test plan: ${result.decision}`,
    );
  }

  return result.plan;
}

function makeStore(
  quantity = 5,
): EvolutionExecutionAtomicStore {
  return new EvolutionExecutionAtomicStore(
    new SpeciesCatalogue(species),
    [profile],
    [
      {
        itemId: "ITEM-001",
        quantity,
      },
    ],
  );
}

describe("EvolutionExecutionAtomicStore", () => {
  it("executes evolution and publishes all state changes together", () => {
    const store = makeStore();

    const result = store.execute(
      makePlan(),
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe("EXECUTED");
    expect(result.executed).toBe(true);

    expect(result.profile).toMatchObject({
      id: "CR-001",
      speciesId: "SP-002",
      evolutionStage: "LINH_HOA",
      version: 4,
    });

    expect(result.inventory).toEqual([
      {
        itemId: "ITEM-001",
        quantity: 3,
      },
    ]);

    expect(result.stateRevision).toBe(2);

    const snapshot = store.snapshot();

    expect(snapshot.profiles[0]).toEqual(result.profile);
    expect(snapshot.inventory).toEqual(result.inventory);
    expect(snapshot.processedRequestIds).toEqual(["REQ-001"]);
    expect(snapshot.revision).toBe(2);
  });

  it("rejects duplicate requests without changing state", () => {
    const store = makeStore();
    const plan = makePlan();

    store.execute(
      plan,
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    const before = store.snapshot();

    const result = store.execute(
      plan,
      "2026-11-26T12:05:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_DUPLICATE_REQUEST",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects stale profile versions without consuming inventory", () => {
    const store = makeStore();

    const plan = {
      ...makePlan(),
      profileVersion: 2,
      expectedProfileVersion: 2,
    };

    const before = store.snapshot();

    const result = store.execute(
      plan,
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_PROFILE_VERSION_CONFLICT",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects source species conflicts without changing state", () => {
    const store = makeStore();

    const plan = {
      ...makePlan(),
      sourceSpeciesId: "SP-002",
    };

    const before = store.snapshot();

    const result = store.execute(
      plan,
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_SOURCE_SPECIES_CONFLICT",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects branch target mismatches without changing state", () => {
    const store = makeStore();

    const plan = {
      ...makePlan(),
      targetSpeciesId: "SP-001",
    };

    const before = store.snapshot();

    const result = store.execute(
      plan,
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_BRANCH_CONFLICT",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects unmet runtime requirements without changing state", () => {
    const store = makeStore();
    const before = store.snapshot();

    const result = store.execute(
      makePlan(),
      "2026-11-26T12:00:00.000Z",
      {
        ...runtimeContext,
        level: 1,
      },
    );

    expect(result.decision).toBe(
      "REJECTED_REQUIREMENTS_NOT_MET",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects invalid runtime contexts without changing state", () => {
    const store = makeStore();
    const before = store.snapshot();

    const result = store.execute(
      makePlan(),
      "2026-11-26T12:00:00.000Z",
      {
        ...runtimeContext,
        completedQuestIds: null as unknown as readonly string[],
      },
    );

    expect(result.decision).toBe(
      "REJECTED_INVALID_CONTEXT",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects invalid execution timestamps without changing state", () => {
    const store = makeStore();
    const before = store.snapshot();

    const result = store.execute(
      makePlan(),
      "not-a-date",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_INVALID_PLAN",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects malformed request IDs without changing state", () => {
    const store = makeStore();
    const before = store.snapshot();

    const result = store.execute(
      {
        ...makePlan(),
        requestId: "bad request",
      },
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_INVALID_PLAN",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects insufficient current inventory without changing state", () => {
    const store = makeStore(1);
    const before = store.snapshot();

    const result = store.execute(
      makePlan(),
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(result.decision).toBe(
      "REJECTED_REQUIREMENTS_NOT_MET",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("returns immutable snapshots and profiles", () => {
    const store = makeStore();

    const snapshot = store.snapshot();
    const storedProfile = store.getProfile("CR-001");

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.profiles)).toBe(true);
    expect(Object.isFrozen(snapshot.inventory)).toBe(true);
    expect(Object.isFrozen(snapshot.processedRequestIds)).toBe(true);
    expect(Object.isFrozen(storedProfile)).toBe(true);
    expect(Object.isFrozen(storedProfile?.talents)).toBe(true);
  });

  it("rejects duplicate initial inventory entries", () => {
    expect(
      () =>
        new EvolutionExecutionAtomicStore(
          new SpeciesCatalogue(species),
          [profile],
          [
            { itemId: "ITEM-001", quantity: 2 },
            { itemId: "ITEM-001", quantity: 3 },
          ],
        ),
    ).toThrow(/DUPLICATE_INVENTORY_ITEM/);
  });

  it("rejects profiles referencing unknown species", () => {
    expect(
      () =>
        new EvolutionExecutionAtomicStore(
          new SpeciesCatalogue(species),
          [
            {
              ...profile,
              speciesId: "SP-999",
            },
          ],
          [
            { itemId: "ITEM-001", quantity: 5 },
          ],
        ),
    ).toThrow(/UNKNOWN_SPECIES_REFERENCE/);
  });

  it("does not mutate caller-owned input objects", () => {
    const store = makeStore();
    const plan = makePlan();

    const planBefore = JSON.stringify(plan);
    const profileBefore = JSON.stringify(profile);
    const contextBefore = JSON.stringify(runtimeContext);

    store.execute(
      plan,
      "2026-11-26T12:00:00.000Z",
      runtimeContext,
    );

    expect(JSON.stringify(plan)).toBe(planBefore);
    expect(JSON.stringify(profile)).toBe(profileBefore);
    expect(JSON.stringify(runtimeContext)).toBe(contextBefore);
  });
});
