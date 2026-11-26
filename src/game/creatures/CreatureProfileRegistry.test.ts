
import { describe, expect, it } from "vitest";

import {
  type CreatureProfile,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";
import { SpeciesCatalogue } from "./SpeciesCatalogue";
import { CreatureProfileRegistry } from "./CreatureProfileRegistry";

const species: SpeciesDefinition = {
  id: "SP-0001",
  name: "Hydrogen Spirit",
  group: "CG-01",
  tier: "PHAM_CHUNG",
  status: "ACTIVE",
  traits: ["elemental"],
  compatibility: ["HYDROGEN"],
  evolutionBranches: [],
  version: 1,
};

const creature: CreatureProfile = {
  id: "CR-0001",
  speciesId: "SP-0001",
  cultivationRealm: "KHAI_VAT_CANH",
  awakeningStage: "SO_TINH",
  evolutionStage: "KHOI_SINH",
  talents: [],
  affinities: [
    {
      elementId: "HYDROGEN",
      level: "SO_CAM",
      primary: true,
    },
  ],
  abilities: [],
  createdAt: "2026-11-25T10:00:00.000Z",
  updatedAt: "2026-11-25T10:00:00.000Z",
  version: 1,
};

function createRegistry(
  initial: readonly CreatureProfile[] = [],
): CreatureProfileRegistry {
  return new CreatureProfileRegistry(
    new SpeciesCatalogue([species]),
    initial,
  );
}

describe("CreatureProfileRegistry", () => {
  it("starts empty", () => {
    const registry = createRegistry();

    expect(registry.size).toBe(0);
    expect(registry.version).toBe(1);
  });

  it("registers a valid Creature Profile", () => {
    const registry = createRegistry();

    const result = registry.register(creature);

    expect(result.valid).toBe(true);
    expect(registry.size).toBe(1);
    expect(registry.getById("CR-0001")?.speciesId).toBe("SP-0001");
  });

  it("rejects duplicate Creature IDs", () => {
    const registry = createRegistry([creature]);

    const result = registry.register(creature);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_CREATURE_ID",
        }),
      ]),
    );
  });

  it("rejects unknown Species references", () => {
    const registry = createRegistry();

    const result = registry.register({
      ...creature,
      speciesId: "SP-9999",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_SPECIES_REFERENCE",
        }),
      ]),
    );
  });

  it("returns undefined for an unknown Creature ID", () => {
    const registry = createRegistry();

    expect(registry.getById("CR-9999")).toBeUndefined();
  });

  it("updates a profile with a higher version", () => {
    const registry = createRegistry([creature]);

    const result = registry.update({
      ...creature,
      updatedAt: "2026-11-26T10:00:00.000Z",
      version: 2,
    });

    expect(result.valid).toBe(true);
    expect(registry.getById("CR-0001")?.version).toBe(2);
  });

  it("rejects updates without a higher version", () => {
    const registry = createRegistry([creature]);

    const result = registry.update({
      ...creature,
      updatedAt: "2026-11-26T10:00:00.000Z",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VERSION_NOT_INCREASED",
        }),
      ]),
    );
  });

  it("rejects stale expected versions", () => {
    const registry = createRegistry([creature]);

    const result = registry.update(
      {
        ...creature,
        version: 2,
        updatedAt: "2026-11-26T10:00:00.000Z",
      },
      99,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VERSION_CONFLICT",
        }),
      ]),
    );
  });

  it("does not allow changing createdAt", () => {
    const registry = createRegistry([creature]);

    const result = registry.update({
      ...creature,
      createdAt: "2026-11-26T10:00:00.000Z",
      updatedAt: "2026-11-26T11:00:00.000Z",
      version: 2,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CREATED_AT_IMMUTABLE",
        }),
      ]),
    );
  });

  it("removes a registered profile", () => {
    const registry = createRegistry([creature]);

    const result = registry.remove("CR-0001");

    expect(result.valid).toBe(true);
    expect(registry.size).toBe(0);
  });

  it("rejects removal with a stale expected version", () => {
    const registry = createRegistry([creature]);

    const result = registry.remove("CR-0001", 99);

    expect(result.valid).toBe(false);
    expect(registry.size).toBe(1);
  });

  it("rejects removal of an unknown profile", () => {
    const registry = createRegistry();

    const result = registry.remove("CR-9999");

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CREATURE_NOT_FOUND",
        }),
      ]),
    );
  });

  it("increments registry version after successful mutations", () => {
    const registry = createRegistry();

    expect(registry.version).toBe(1);

    registry.register(creature);
    expect(registry.version).toBe(2);

    registry.update({
      ...creature,
      version: 2,
      updatedAt: "2026-11-26T10:00:00.000Z",
    });
    expect(registry.version).toBe(3);

    registry.remove("CR-0001");
    expect(registry.version).toBe(4);
  });

  it("does not increment registry version after failed mutations", () => {
    const registry = createRegistry();

    registry.register({
      ...creature,
      speciesId: "SP-9999",
    });

    expect(registry.version).toBe(1);
  });

  it("returns immutable profiles", () => {
    const registry = createRegistry([creature]);

    const profile = registry.getById("CR-0001");

    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile?.talents)).toBe(true);
    expect(Object.isFrozen(profile?.affinities)).toBe(true);
    expect(Object.isFrozen(profile?.abilities)).toBe(true);
  });

  it("returns a frozen snapshot", () => {
    const registry = createRegistry([creature]);

    const snapshot = registry.snapshot();

    expect(snapshot.version).toBe(1);
    expect(snapshot.profiles).toHaveLength(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.profiles)).toBe(true);
  });

  it("rejects invalid initial profiles", () => {
    expect(
      () =>
        new CreatureProfileRegistry(
          new SpeciesCatalogue([species]),
          [{ ...creature, speciesId: "SP-9999" }],
        ),
    ).toThrow(/UNKNOWN_SPECIES_REFERENCE/);
  });

  it("rejects duplicate IDs in initial profiles", () => {
    expect(
      () =>
        new CreatureProfileRegistry(
          new SpeciesCatalogue([species]),
          [creature, creature],
        ),
    ).toThrow(/DUPLICATE_CREATURE_ID/);
  });
});
