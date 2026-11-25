import { describe, expect, it } from "vitest";

import {
  SpeciesCatalogue,
} from "./SpeciesCatalogue";

import type {
  SpeciesDefinition,
} from "./CreatureRealmContracts";

const hydrogen: SpeciesDefinition = {
  id: "SP-0001",
  name: "Hydrogen Spirit",
  group: "CG-01",
  tier: "PHAM_CHUNG",
  status: "DRAFT",
  traits: ["elemental"],
  compatibility: ["HYDROGEN"],
  evolutionBranches: [],
  version: 1,
};

const oxygen: SpeciesDefinition = {
  id: "SP-0002",
  name: "Oxygen Spirit",
  group: "CG-01",
  tier: "LINH_CHUNG",
  status: "DRAFT",
  traits: ["reactive"],
  compatibility: ["OXYGEN"],
  evolutionBranches: [],
  version: 1,
};

describe("SpeciesCatalogue", () => {
  it("starts with an empty catalogue", () => {
    const catalogue = new SpeciesCatalogue();

    expect(catalogue.size).toBe(0);
    expect(catalogue.version).toBe(1);
  });

  it("registers a valid Species", () => {
    const catalogue = new SpeciesCatalogue();

    const result = catalogue.register(hydrogen);

    expect(result.valid).toBe(true);
    expect(catalogue.size).toBe(1);
    expect(catalogue.getById("SP-0001")?.name).toBe(
      "Hydrogen Spirit",
    );
  });

  it("rejects duplicate Species IDs", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const result = catalogue.register(hydrogen);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_SPECIES_ID",
        }),
      ]),
    );
  });

  it("requires new Species to start as DRAFT", () => {
    const catalogue = new SpeciesCatalogue();

    const result = catalogue.register({
      ...hydrogen,
      status: "ACTIVE",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INITIAL_STATUS_MUST_BE_DRAFT",
        }),
      ]),
    );
  });

  it("rejects unknown evolution targets", () => {
    const catalogue = new SpeciesCatalogue();

    const result = catalogue.register({
      ...hydrogen,
      evolutionBranches: [
        {
          id: "BR-0001",
          targetSpeciesId: "SP-9999",
          requirements: ["QUEST-001"],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_EVOLUTION_TARGET",
        }),
      ]),
    );
  });

  it("accepts evolution targets already registered", () => {
    const catalogue = new SpeciesCatalogue([oxygen]);

    const result = catalogue.register({
      ...hydrogen,
      evolutionBranches: [
        {
          id: "BR-0001",
          targetSpeciesId: "SP-0002",
          requirements: ["QUEST-001"],
        },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("does not impose a universal evolution branch limit", () => {
    const targets = Array.from({ length: 12 }, (_, index) => ({
      ...oxygen,
      id: `SP-${String(index + 2).padStart(4, "0")}`,
    }));

    const branches = targets.map((target, index) => ({
      id: `BR-${String(index + 1).padStart(4, "0")}`,
      targetSpeciesId: target.id,
      requirements: [],
    }));

    const catalogue = new SpeciesCatalogue(targets);

    expect(
      catalogue.register({
        ...hydrogen,
        evolutionBranches: branches,
      }).valid,
    ).toBe(true);
  });

  it("returns undefined for an unknown ID", () => {
    const catalogue = new SpeciesCatalogue();

    expect(catalogue.getById("SP-9999")).toBeUndefined();
  });

  it("filters Species by lifecycle status", () => {
    const catalogue = new SpeciesCatalogue([
      hydrogen,
      oxygen,
    ]);

    expect(catalogue.getByStatus("DRAFT")).toHaveLength(2);
    expect(catalogue.getByStatus("ACTIVE")).toHaveLength(0);
  });

  it("allows valid lifecycle transitions", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    expect(
      catalogue.transitionStatus("SP-0001", "VALIDATING").valid,
    ).toBe(true);

    expect(
      catalogue.transitionStatus("SP-0001", "REVIEW").valid,
    ).toBe(true);

    expect(
      catalogue.transitionStatus("SP-0001", "APPROVED").valid,
    ).toBe(true);

    expect(
      catalogue.transitionStatus("SP-0001", "ACTIVE").valid,
    ).toBe(true);

    expect(catalogue.getById("SP-0001")?.status).toBe("ACTIVE");
  });

  it("rejects invalid lifecycle transitions", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const result = catalogue.transitionStatus(
      "SP-0001",
      "ACTIVE",
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_STATUS_TRANSITION",
        }),
      ]),
    );
  });

  it("rejects lifecycle changes with a stale expected version", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const result = catalogue.transitionStatus(
      "SP-0001",
      "VALIDATING",
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

  it("increments Species version after a transition", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    catalogue.transitionStatus("SP-0001", "VALIDATING");

    expect(catalogue.getById("SP-0001")?.version).toBe(2);
  });

  it("updates a Species only with a higher version", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const result = catalogue.update({
      ...hydrogen,
      name: "Updated Hydrogen Spirit",
      version: 2,
    });

    expect(result.valid).toBe(true);
    expect(catalogue.getById("SP-0001")?.name).toBe(
      "Updated Hydrogen Spirit",
    );
  });

  it("rejects updates without a higher version", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const result = catalogue.update({
      ...hydrogen,
      name: "Updated Hydrogen Spirit",
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

  it("requires lifecycle changes to use transitionStatus", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const result = catalogue.update({
      ...hydrogen,
      status: "VALIDATING",
      version: 2,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "STATUS_CHANGE_REQUIRES_TRANSITION",
        }),
      ]),
    );
  });

  it("rejects updates for unknown Species", () => {
    const catalogue = new SpeciesCatalogue();

    const result = catalogue.update(hydrogen);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SPECIES_NOT_FOUND",
        }),
      ]),
    );
  });

  it("increments catalogue version after successful mutations", () => {
    const catalogue = new SpeciesCatalogue();

    expect(catalogue.version).toBe(1);

    catalogue.register(hydrogen);
    expect(catalogue.version).toBe(2);

    catalogue.transitionStatus("SP-0001", "VALIDATING");
    expect(catalogue.version).toBe(3);
  });

  it("does not increment catalogue version after failed mutations", () => {
    const catalogue = new SpeciesCatalogue();

    const result = catalogue.register({
      ...hydrogen,
      status: "ACTIVE",
    });

    expect(result.valid).toBe(false);
    expect(catalogue.version).toBe(1);
  });

  it("returns a catalogue snapshot", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const snapshot = catalogue.snapshot();

    expect(snapshot.version).toBe(1);
    expect(snapshot.species).toHaveLength(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("returns immutable catalogue records", () => {
    const catalogue = new SpeciesCatalogue([hydrogen]);

    const species = catalogue.getById("SP-0001");

    expect(species).toBeDefined();
    expect(Object.isFrozen(species)).toBe(true);
    expect(Object.isFrozen(species?.traits)).toBe(true);
    expect(Object.isFrozen(species?.evolutionBranches)).toBe(true);
  });
});