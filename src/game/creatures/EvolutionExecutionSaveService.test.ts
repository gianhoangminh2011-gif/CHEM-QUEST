
import { describe, expect, it } from "vitest";

import type {
  CreatureProfile,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

import { SpeciesCatalogue } from "./SpeciesCatalogue";

import {
  EVOLUTION_SAVE_SCHEMA_VERSION,
  EvolutionExecutionSaveService,
  type EvolutionExecutionStorage,
} from "./EvolutionExecutionSaveService";

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

const species: SpeciesDefinition[] = [
  {
    id: "SP-001",
    name: "Test Species",
    group: "CG-01",
    tier: "PHAM_CHUNG",
    status: "ACTIVE",
    traits: [],
    compatibility: [],
    evolutionBranches: [],
    version: 1,
  },
];

class MemoryStorage implements EvolutionExecutionStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  seed(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function makeSnapshot() {
  return {
    revision: 2,
    profiles: [profile],
    inventory: [
      { itemId: "ITEM-001", quantity: 7 },
      { itemId: "ITEM-002", quantity: 3 },
    ],
    processedRequestIds: ["REQ-001", "REQ-002"],
  };
}

function makeService(storage = new MemoryStorage()) {
  return {
    storage,
    service: new EvolutionExecutionSaveService(
      storage,
      new SpeciesCatalogue(species),
      undefined,
      () => "2026-11-26T12:00:00.000Z",
    ),
  };
}

describe("EvolutionExecutionSaveService", () => {
  it("saves and restores a complete snapshot", () => {
    const { storage, service } = makeService();

    service.save(makeSnapshot());

    const loaded = service.load();

    expect(loaded.found).toBe(true);
    expect(loaded.issues).toEqual([]);
    expect(loaded.record?.schemaVersion).toBe(
      EVOLUTION_SAVE_SCHEMA_VERSION,
    );
    expect(loaded.record?.snapshot).toEqual(makeSnapshot());
  });

  it("preserves profiles, ITEM inventory and processed request IDs", () => {
    const { service } = makeService();

    service.save(makeSnapshot());

    const loaded = service.load();
    const snapshot = loaded.record?.snapshot;

    expect(snapshot?.profiles).toEqual([profile]);
    expect(snapshot?.inventory).toEqual([
      { itemId: "ITEM-001", quantity: 7 },
      { itemId: "ITEM-002", quantity: 3 },
    ]);
    expect(snapshot?.processedRequestIds).toEqual([
      "REQ-001",
      "REQ-002",
    ]);
    expect(snapshot?.revision).toBe(2);
  });

  it("returns an empty result when no save exists", () => {
    const { service } = makeService();

    expect(service.load()).toEqual({
      found: false,
      record: null,
      issues: [],
    });
  });

  it("rejects corrupted JSON", () => {
    const { storage, service } = makeService();

    storage.seed(
      "chem-quest.creature-realm.evolution.v1",
      "{invalid-json",
    );

    const loaded = service.load();

    expect(loaded.found).toBe(true);
    expect(loaded.record).toBeNull();
    expect(loaded.issues[0]?.code).toBe(
      "CORRUPTED_SAVE_JSON",
    );
  });

  it("rejects an unsupported schema version", () => {
    const { storage, service } = makeService();

    storage.seed(
      "chem-quest.creature-realm.evolution.v1",
      JSON.stringify({
        schemaVersion: 999,
        savedAt: "2026-11-26T12:00:00.000Z",
        snapshot: makeSnapshot(),
      }),
    );

    const loaded = service.load();

    expect(loaded.record).toBeNull();
    expect(loaded.issues[0]?.code).toBe(
      "UNSUPPORTED_OR_INVALID_SAVE_SCHEMA",
    );
  });

  it("rejects duplicate inventory entries", () => {
    const { service } = makeService();

    expect(() =>
      service.save({
        ...makeSnapshot(),
        inventory: [
          { itemId: "ITEM-001", quantity: 2 },
          { itemId: "ITEM-001", quantity: 5 },
        ],
      }),
    ).toThrow(/DUPLICATE_SAVE_INVENTORY_ITEM/);
  });

  it("rejects invalid processed request IDs", () => {
    const { service } = makeService();

    expect(() =>
      service.save({
        ...makeSnapshot(),
        processedRequestIds: ["invalid request"],
      }),
    ).toThrow(/INVALID_SAVE_REQUEST_ID/);
  });

  it("does not mutate the caller-owned snapshot", () => {
    const { service } = makeService();
    const snapshot = makeSnapshot();
    const before = JSON.stringify(snapshot);

    service.save(snapshot);

    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("propagates storage write failures", () => {
    const storage: EvolutionExecutionStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    };

    const service = new EvolutionExecutionSaveService(
      storage,
      new SpeciesCatalogue(species),
    );

    expect(() => service.save(makeSnapshot())).toThrow(
      "Storage unavailable",
    );
  });

  it("reports storage read failures", () => {
    const storage: EvolutionExecutionStorage = {
      getItem: () => {
        throw new Error("Read failed");
      },
      setItem: () => undefined,
    };

    const service = new EvolutionExecutionSaveService(
      storage,
      new SpeciesCatalogue(species),
    );

    const loaded = service.load();

    expect(loaded.found).toBe(false);
    expect(loaded.record).toBeNull();
    expect(loaded.issues[0]?.code).toBe(
      "SAVE_READ_FAILED",
    );
  });
});
