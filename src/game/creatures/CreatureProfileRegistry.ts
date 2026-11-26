
import {
  validateSpeciesReferences,
  type ContractIssue,
  type CreatureProfile,
} from "./CreatureRealmContracts";
import { SpeciesCatalogue } from "./SpeciesCatalogue";

export interface CreatureProfileRegistryResult {
  valid: boolean;
  issues: readonly ContractIssue[];
}

export interface CreatureProfileRegistrySnapshot {
  version: number;
  profiles: readonly CreatureProfile[];
}

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function freezeProfile(
  profile: CreatureProfile,
): CreatureProfile {
  return Object.freeze({
    ...profile,
    talents: Object.freeze(
      profile.talents.map((talent) =>
        Object.freeze({ ...talent }),
      ),
    ),
    affinities: Object.freeze(
      profile.affinities.map((affinity) =>
        Object.freeze({ ...affinity }),
      ),
    ),
    abilities: Object.freeze(
      profile.abilities.map((ability) =>
        Object.freeze({ ...ability }),
      ),
    ),
  });
}

function result(
  issues: ContractIssue[],
): CreatureProfileRegistryResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}

export class CreatureProfileRegistry {
  private readonly entries = new Map<string, CreatureProfile>();
  private registryVersion = 1;

  constructor(
    private readonly speciesCatalogue: SpeciesCatalogue,
    initial: readonly CreatureProfile[] = [],
  ) {
    const issues: ContractIssue[] = [];
    const ids = new Set<string>();
    const species = speciesCatalogue.getAll();

    initial.forEach((profile, index) => {
      const validation = validateSpeciesReferences(profile, species);

      for (const entry of validation.issues) {
        issues.push(
          makeIssue(
            entry.code,
            `[${index}].${entry.path}`,
            entry.message,
          ),
        );
      }

      if (ids.has(profile.id)) {
        issues.push(
          makeIssue(
            "DUPLICATE_CREATURE_ID",
            `[${index}].id`,
            "Creature ID must be unique.",
          ),
        );
      }

      ids.add(profile.id);
    });

    if (issues.length > 0) {
      throw new Error(
        `Invalid Creature Profile registry: ${issues
          .map((entry) => entry.code)
          .join(", ")}`,
      );
    }

    for (const profile of initial) {
      this.entries.set(profile.id, freezeProfile(profile));
    }
  }

  get version(): number {
    return this.registryVersion;
  }

  get size(): number {
    return this.entries.size;
  }

  getById(id: string): CreatureProfile | undefined {
    return this.entries.get(id);
  }

  getAll(): readonly CreatureProfile[] {
    return Object.freeze([...this.entries.values()]);
  }

  private validateProfile(
    profile: CreatureProfile,
  ): ContractIssue[] {
    return [
      ...validateSpeciesReferences(
        profile,
        this.speciesCatalogue.getAll(),
      ).issues,
    ];
  }

  register(
    profile: CreatureProfile,
  ): CreatureProfileRegistryResult {
    const issues = this.validateProfile(profile);

    if (this.entries.has(profile.id)) {
      issues.push(
        makeIssue(
          "DUPLICATE_CREATURE_ID",
          "id",
          "Creature ID is already registered.",
        ),
      );
    }

    if (issues.length > 0) {
      return result(issues);
    }

    this.entries.set(profile.id, freezeProfile(profile));
    this.registryVersion += 1;

    return result([]);
  }

  update(
    profile: CreatureProfile,
    expectedVersion?: number,
  ): CreatureProfileRegistryResult {
    const current = this.entries.get(profile.id);

    if (!current) {
      return result([
        makeIssue(
          "CREATURE_NOT_FOUND",
          "id",
          "Creature Profile does not exist.",
        ),
      ]);
    }

    const issues = this.validateProfile(profile);

    if (
      expectedVersion !== undefined &&
      expectedVersion !== current.version
    ) {
      issues.push(
        makeIssue(
          "VERSION_CONFLICT",
          "version",
          "Creature Profile version does not match the expected version.",
        ),
      );
    }

    if (profile.version <= current.version) {
      issues.push(
        makeIssue(
          "VERSION_NOT_INCREASED",
          "version",
          "An updated Creature Profile must use a higher version.",
        ),
      );
    }

    if (profile.createdAt !== current.createdAt) {
      issues.push(
        makeIssue(
          "CREATED_AT_IMMUTABLE",
          "createdAt",
          "The original creation timestamp cannot be changed.",
        ),
      );
    }

    if (issues.length > 0) {
      return result(issues);
    }

    this.entries.set(profile.id, freezeProfile(profile));
    this.registryVersion += 1;

    return result([]);
  }

  remove(
    id: string,
    expectedVersion?: number,
  ): CreatureProfileRegistryResult {
    const current = this.entries.get(id);

    if (!current) {
      return result([
        makeIssue(
          "CREATURE_NOT_FOUND",
          "id",
          "Creature Profile does not exist.",
        ),
      ]);
    }

    if (
      expectedVersion !== undefined &&
      expectedVersion !== current.version
    ) {
      return result([
        makeIssue(
          "VERSION_CONFLICT",
          "version",
          "Creature Profile version does not match the expected version.",
        ),
      ]);
    }

    this.entries.delete(id);
    this.registryVersion += 1;

    return result([]);
  }

  snapshot(): CreatureProfileRegistrySnapshot {
    return Object.freeze({
      version: this.registryVersion,
      profiles: this.getAll(),
    });
  }
}
