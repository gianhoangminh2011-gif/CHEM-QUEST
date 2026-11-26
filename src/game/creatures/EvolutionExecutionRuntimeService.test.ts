
import { describe, expect, it } from "vitest";

import type {
  CreatureProfile,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import { SpeciesCatalogue } from "./SpeciesCatalogue";

import {
  EvolutionExecutionAtomicStore,
  type EvolutionExecutionRuntimeContext,
  type EvolutionAtomicStoreSnapshot,
} from "./EvolutionExecutionAtomicStore";

import type {
  EvolutionExecutionSaveService,
} from "./EvolutionExecutionSaveService";

import {
  EvolutionExecutionRuntimeService,
  type EvolutionExecutionRuntimeRequest,
} from "./EvolutionExecutionRuntimeService";

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

const validRequest: EvolutionExecutionRuntimeRequest = {
  requestId: "REQ-001",
  creatureId: "CR-001",
  branchId: "BR-001",
  executedAt: "2026-11-26T12:00:00.000Z",
  runtimeContext,
};

class MemoryPersistence {
  snapshot: EvolutionAtomicStoreSnapshot | null = null;
  shouldFailSave = false;

  load() {
    return {
      found: this.snapshot !== null,
      record: this.snapshot
        ? {
            schemaVersion: 1,
            savedAt: "2026-11-26T12:00:00.000Z",
            snapshot: this.snapshot,
          }
        : null,
      issues: [],
    };
  }

  save(snapshot: EvolutionAtomicStoreSnapshot) {
    if (this.shouldFailSave) {
      throw new Error("Simulated persistence failure");
    }

    this.snapshot = snapshot;
  }

  asService(): EvolutionExecutionSaveService {
    return this as unknown as EvolutionExecutionSaveService;
  }
}

function makeSystem(
  options: {
    inventory?: number;
    persistence?: MemoryPersistence;
  } = {},
) {
  const catalogue = new SpeciesCatalogue(species);

  const store = new EvolutionExecutionAtomicStore(
    catalogue,
    [profile],
    [
      {
        itemId: "ITEM-001",
        quantity: options.inventory ?? 5,
      },
    ],
    options.persistence?.asService(),
  );

  const service = new EvolutionExecutionRuntimeService(
    catalogue,
    store,
  );

  return { catalogue, store, service };
}

describe("EvolutionExecutionRuntimeService", () => {
  it("executes a valid evolution through the complete runtime flow", () => {
    const { store, service } = makeSystem();

    const result = service.execute(validRequest);

    expect(result.decision).toBe("EXECUTED");
    expect(result.executed).toBe(true);
    expect(result.transaction?.transactionPlanned).toBe(true);
    expect(result.execution?.decision).toBe("EXECUTED");

    expect(store.getProfile("CR-001")).toMatchObject({
      speciesId: "SP-002",
      evolutionStage: "LINH_HOA",
      version: 4,
    });

    expect(store.getInventory()).toEqual([
      {
        itemId: "ITEM-001",
        quantity: 3,
      },
    ]);

    expect(store.snapshot().processedRequestIds).toEqual([
      "REQ-001",
    ]);

    expect(store.revision).toBe(2);
  });

  it("rejects duplicate requests before atomic execution", () => {
    const { store, service } = makeSystem();

    const first = service.execute(validRequest);

    expect(first.decision).toBe("EXECUTED");

    const before = store.snapshot();

    const duplicate = service.execute({
      ...validRequest,
      executedAt: "2026-11-26T12:05:00.000Z",
    });

    expect(duplicate.decision).toBe("REJECTED_TRANSACTION");
    expect(duplicate.transaction?.coordinatorResult.decision).toBe(
      "REJECTED_DUPLICATE_REQUEST",
    );

    expect(store.snapshot()).toEqual(before);
  });

  it("rejects a missing Creature Profile", () => {
    const { store, service } = makeSystem();
    const before = store.snapshot();

    const result = service.execute({
      ...validRequest,
      creatureId: "CR-999",
    });

    expect(result.decision).toBe("REJECTED_CREATURE_NOT_FOUND");
    expect(store.snapshot()).toEqual(before);
  });

  it("rejects invalid request identifiers", () => {
    const { store, service } = makeSystem();
    const before = store.snapshot();

    const result = service.execute({
      ...validRequest,
      requestId: "invalid request id",
    });

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(store.snapshot()).toEqual(before);
  });

  it("rejects invalid execution timestamps", () => {
    const { store, service } = makeSystem();
    const before = store.snapshot();

    const result = service.execute({
      ...validRequest,
      executedAt: "not-a-date",
    });

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(store.snapshot()).toEqual(before);
  });

  it("rejects invalid runtime levels", () => {
    const { store, service } = makeSystem();
    const before = store.snapshot();

    const result = service.execute({
      ...validRequest,
      runtimeContext: {
        ...runtimeContext,
        level: 0,
      },
    });

    expect(result.decision).toBe("REJECTED_INVALID_REQUEST");
    expect(store.snapshot()).toEqual(before);
  });

  it("rejects unmet requirements without mutating state", () => {
    const { store, service } = makeSystem();
    const before = store.snapshot();

    const result = service.execute({
      ...validRequest,
      runtimeContext: {
        ...runtimeContext,
        level: 1,
      },
    });

    expect(result.decision).toBe("REJECTED_TRANSACTION");
    expect(result.transaction?.decision).toBe("REQUIREMENTS_NOT_MET");
    expect(store.snapshot()).toEqual(before);
  });

  it("rejects insufficient inventory without consuming items", () => {
    const { store, service } = makeSystem({
      inventory: 1,
    });

    const before = store.snapshot();

    const result = service.execute(validRequest);

    expect(result.decision).toBe("REJECTED_TRANSACTION");
    expect(result.transaction?.decision).toBe(
      "REQUIREMENTS_NOT_MET",
    );
    expect(store.snapshot()).toEqual(before);
  });

  it("rejects unknown evolution branches without mutating state", () => {
    const { store, service } = makeSystem();
    const before = store.snapshot();

    const result = service.execute({
      ...validRequest,
      branchId: "BR-999",
    });

    expect(result.decision).toBe("REJECTED_TRANSACTION");
    expect(store.snapshot()).toEqual(before);
  });

  it("does not publish state when durable persistence fails", () => {
    const persistence = new MemoryPersistence();
    persistence.shouldFailSave = true;

    const { store, service } = makeSystem({
      persistence,
    });

    const before = store.snapshot();

    const result = service.execute(validRequest);

    expect(result.decision).toBe("REJECTED_PERSISTENCE_FAILURE");
    expect(result.executed).toBe(false);
    expect(result.execution?.decision).toBe(
      "REJECTED_PERSISTENCE_FAILURE",
    );

    expect(store.snapshot()).toEqual(before);
    expect(store.getProfile("CR-001")?.speciesId).toBe("SP-001");
    expect(store.getInventory()).toEqual([
      {
        itemId: "ITEM-001",
        quantity: 5,
      },
    ]);
  });

  it("does not mutate caller-owned request or runtime context", () => {
    const { service } = makeSystem();

    const request = {
      ...validRequest,
      runtimeContext: {
        ...runtimeContext,
        completedQuestIds: [...runtimeContext.completedQuestIds],
        affinities: [...runtimeContext.affinities],
      },
    };

    const before = JSON.stringify(request);

    service.execute(request);

    expect(JSON.stringify(request)).toBe(before);
  });

  it("returns a normalized result with immutable issues", () => {
    const { service } = makeSystem();

    const result = service.execute({
      ...validRequest,
      requestId: "invalid",
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
