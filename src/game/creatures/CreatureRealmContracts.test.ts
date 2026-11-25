
import { describe, expect, it } from "vitest";

import {
  buildSpeciesCatalogue,
  validateCreatureProfile,
  validateSpeciesDefinition,
  validateSpeciesReferences,
  type CreatureProfile,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";

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
  talents: [
    {
      id: "TAL-0001",
      category: "TAL-E",
      grade: "SO_CAP",
      innate: true,
    },
  ],
  affinities: [
    {
      elementId: "HYDROGEN",
      level: "SO_CAM",
      primary: true,
    },
  ],
  abilities: [
    {
      id: "ABL-0001",
      category: "ELEMENTAL",
      progress: "UNLOCKED",
    },
  ],
  createdAt: "2026-11-25T10:00:00.000Z",
  updatedAt: "2026-11-25T10:00:00.000Z",
  version: 1,
};

describe("validateSpeciesDefinition", () => {
  it("accepts a valid Species definition", () => {
    expect(validateSpeciesDefinition(species).valid).toBe(true);
  });

  it("rejects an invalid Species ID", () => {
    const result = validateSpeciesDefinition({
      ...species,
      id: "invalid id",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_ID" }),
      ]),
    );
  });

  it("rejects unknown creature groups", () => {
    const result = validateSpeciesDefinition({
      ...species,
      group: "CG-99",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects unknown tiers", () => {
    const result = validateSpeciesDefinition({
      ...species,
      tier: "MYTHIC",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid evolution branch references", () => {
    const result = validateSpeciesDefinition({
      ...species,
      evolutionBranches: [
        {
          id: "BR-0001",
          targetSpeciesId: "invalid id",
          requirements: [],
        },
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("does not impose a universal evolution branch limit", () => {
    const branches = Array.from({ length: 12 }, (_, index) => ({
      id: `BR-${String(index + 1).padStart(4, "0")}`,
      targetSpeciesId: `SP-${String(index + 2).padStart(4, "0")}`,
      requirements: [],
    }));

    expect(
      validateSpeciesDefinition({
        ...species,
        evolutionBranches: branches,
      }).valid,
    ).toBe(true);
  });
});

describe("validateCreatureProfile", () => {
  it("accepts a valid Creature profile", () => {
    expect(validateCreatureProfile(creature).valid).toBe(true);
  });

  it("rejects invalid cultivation realms", () => {
    const result = validateCreatureProfile({
      ...creature,
      cultivationRealm: "UNKNOWN_REALM",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid awakening stages", () => {
    const result = validateCreatureProfile({
      ...creature,
      awakeningStage: "STAGE_99",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects multiple primary affinities", () => {
    const result = validateCreatureProfile({
      ...creature,
      affinities: [
        ...creature.affinities,
        {
          elementId: "OXYGEN",
          level: "CAM_UNG",
          primary: true,
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MULTIPLE_PRIMARY_AFFINITIES",
        }),
      ]),
    );
  });

  it("rejects malformed talent records", () => {
    const result = validateCreatureProfile({
      ...creature,
      talents: [null],
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid timestamps", () => {
    const result = validateCreatureProfile({
      ...creature,
      createdAt: "not-a-date",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid versions", () => {
    const result = validateCreatureProfile({
      ...creature,
      version: 0,
    });

    expect(result.valid).toBe(false);
  });
});

describe("Species catalogue", () => {
  it("accepts a valid catalogue", () => {
    const result = buildSpeciesCatalogue([species]);

    expect(result.valid).toBe(true);
    expect(result.species).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects duplicate Species IDs", () => {
    const result = buildSpeciesCatalogue([
      species,
      { ...species, name: "Duplicate" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.species).toHaveLength(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_SPECIES_ID",
        }),
      ]),
    );
  });

  it("rejects non-array catalogue input", () => {
    const result = buildSpeciesCatalogue(null);

    expect(result.valid).toBe(false);
    expect(result.species).toHaveLength(0);
  });
});

describe("Species reference integrity", () => {
  it("accepts an existing Species reference", () => {
    expect(
      validateSpeciesReferences(creature, [species]).valid,
    ).toBe(true);
  });

  it("rejects a missing Species reference", () => {
    const result = validateSpeciesReferences(
      { ...creature, speciesId: "SP-9999" },
      [species],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_SPECIES_REFERENCE",
        }),
      ]),
    );
  });
});
