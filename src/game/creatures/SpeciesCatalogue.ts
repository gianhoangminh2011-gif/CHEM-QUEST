import {
  SPECIES_STATUSES,
  validateSpeciesDefinition,
  type ContractIssue,
  type SpeciesDefinition,
  type SpeciesStatus,
} from "./CreatureRealmContracts";

export interface SpeciesCatalogueResult {
  valid: boolean;
  issues: readonly ContractIssue[];
}

export interface SpeciesCatalogueSnapshot {
  version: number;
  species: readonly SpeciesDefinition[];
}

const TRANSITIONS: Readonly<
  Record<SpeciesStatus, readonly SpeciesStatus[]>
> = Object.freeze({
  DRAFT: ["VALIDATING", "ARCHIVED"],
  VALIDATING: ["DRAFT", "REVIEW", "ARCHIVED"],
  REVIEW: ["DRAFT", "APPROVED", "ARCHIVED"],
  APPROVED: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["DEPRECATED"],
  DEPRECATED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
});

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function freezeSpecies(
  species: SpeciesDefinition,
): SpeciesDefinition {
  return Object.freeze({
    ...species,
    traits: Object.freeze([...species.traits]),
    compatibility: Object.freeze([...species.compatibility]),
    evolutionBranches: Object.freeze(
      species.evolutionBranches.map((branch) =>
        Object.freeze({
          ...branch,
          requirements: Object.freeze([...branch.requirements]),
        }),
      ),
    ),
  });
}

function compareVersion(
  previous: SpeciesDefinition,
  next: SpeciesDefinition,
): ContractIssue[] {
  if (next.version <= previous.version) {
    return [
      makeIssue(
        "VERSION_NOT_INCREASED",
        "version",
        "An updated Species must use a higher version.",
      ),
    ];
  }

  return [];
}

export class SpeciesCatalogue {
  private readonly entries = new Map<string, SpeciesDefinition>();
  private catalogueVersion = 1;

  constructor(initial: readonly SpeciesDefinition[] = []) {
    const result = this.validateCatalogue(initial);

    if (!result.valid) {
      throw new Error(
        `Invalid initial Species catalogue: ${result.issues
          .map((entry) => entry.code)
          .join(", ")}`,
      );
    }

    for (const species of initial) {
      this.entries.set(species.id, freezeSpecies(species));
    }
  }

  get version(): number {
    return this.catalogueVersion;
  }

  get size(): number {
    return this.entries.size;
  }

  getById(id: string): SpeciesDefinition | undefined {
    return this.entries.get(id);
  }

  getAll(): readonly SpeciesDefinition[] {
    return Object.freeze([...this.entries.values()]);
  }

  getByStatus(status: SpeciesStatus): readonly SpeciesDefinition[] {
    return Object.freeze(
      [...this.entries.values()].filter(
        (species) => species.status === status,
      ),
    );
  }

  validateCatalogue(
    input: readonly SpeciesDefinition[],
  ): SpeciesCatalogueResult {
    const issues: ContractIssue[] = [];
    const ids = new Set<string>();

    input.forEach((species, index) => {
      const validation = validateSpeciesDefinition(species);

      for (const entry of validation.issues) {
        issues.push(
          makeIssue(
            entry.code,
            `[${index}].${entry.path}`,
            entry.message,
          ),
        );
      }

      if (ids.has(species.id)) {
        issues.push(
          makeIssue(
            "DUPLICATE_SPECIES_ID",
            `[${index}].id`,
            "Species ID must be unique.",
          ),
        );
      }

      ids.add(species.id);
    });

    const knownIds = new Set(input.map((species) => species.id));

    input.forEach((species, index) => {
      species.evolutionBranches.forEach((branch, branchIndex) => {
        if (!knownIds.has(branch.targetSpeciesId)) {
          issues.push(
            makeIssue(
              "UNKNOWN_EVOLUTION_TARGET",
              `[${index}].evolutionBranches[${branchIndex}].targetSpeciesId`,
              "Evolution target must exist in the catalogue.",
            ),
          );
        }

        if (branch.targetSpeciesId === species.id) {
          issues.push(
            makeIssue(
              "SELF_EVOLUTION_REFERENCE",
              `[${index}].evolutionBranches[${branchIndex}].targetSpeciesId`,
              "A Species cannot target itself.",
            ),
          );
        }
      });
    });

    return Object.freeze({
      valid: issues.length === 0,
      issues: Object.freeze(issues),
    });
  }

  register(species: SpeciesDefinition): SpeciesCatalogueResult {
    const issues = [...validateSpeciesDefinition(species).issues];

    if (this.entries.has(species.id)) {
      issues.push(
        makeIssue(
          "DUPLICATE_SPECIES_ID",
          "id",
          "Species ID is already registered.",
        ),
      );
    }

    if (species.status !== "DRAFT") {
      issues.push(
        makeIssue(
          "INITIAL_STATUS_MUST_BE_DRAFT",
          "status",
          "New Species must enter the catalogue as DRAFT.",
        ),
      );
    }

    for (const branch of species.evolutionBranches) {
      if (!this.entries.has(branch.targetSpeciesId)) {
        issues.push(
          makeIssue(
            "UNKNOWN_EVOLUTION_TARGET",
            "evolutionBranches",
            `Unknown evolution target: ${branch.targetSpeciesId}.`,
          ),
        );
      }
    }

    if (issues.length > 0) {
      return Object.freeze({
        valid: false,
        issues: Object.freeze(issues),
      });
    }

    this.entries.set(species.id, freezeSpecies(species));
    this.catalogueVersion += 1;

    return Object.freeze({ valid: true, issues: Object.freeze([]) });
  }

  update(species: SpeciesDefinition): SpeciesCatalogueResult {
    const current = this.entries.get(species.id);

    if (!current) {
      return Object.freeze({
        valid: false,
        issues: Object.freeze([
          makeIssue("SPECIES_NOT_FOUND", "id", "Species does not exist."),
        ]),
      });
    }

    const issues = [
      ...validateSpeciesDefinition(species).issues,
      ...compareVersion(current, species),
    ];

    if (species.status !== current.status) {
      issues.push(
        makeIssue(
          "STATUS_CHANGE_REQUIRES_TRANSITION",
          "status",
          "Use transitionStatus to change lifecycle status.",
        ),
      );
    }

    for (const branch of species.evolutionBranches) {
      if (
        branch.targetSpeciesId !== species.id &&
        !this.entries.has(branch.targetSpeciesId)
      ) {
        issues.push(
          makeIssue(
            "UNKNOWN_EVOLUTION_TARGET",
            "evolutionBranches",
            `Unknown evolution target: ${branch.targetSpeciesId}.`,
          ),
        );
      }
    }

    if (issues.length > 0) {
      return Object.freeze({
        valid: false,
        issues: Object.freeze(issues),
      });
    }

    this.entries.set(species.id, freezeSpecies(species));
    this.catalogueVersion += 1;

    return Object.freeze({ valid: true, issues: Object.freeze([]) });
  }

  transitionStatus(
    id: string,
    nextStatus: SpeciesStatus,
    expectedVersion?: number,
  ): SpeciesCatalogueResult {
    const current = this.entries.get(id);

    if (!current) {
      return Object.freeze({
        valid: false,
        issues: Object.freeze([
          makeIssue("SPECIES_NOT_FOUND", "id", "Species does not exist."),
        ]),
      });
    }

    if (
      expectedVersion !== undefined &&
      expectedVersion !== current.version
    ) {
      return Object.freeze({
        valid: false,
        issues: Object.freeze([
          makeIssue(
            "VERSION_CONFLICT",
            "version",
            "Species version does not match the expected version.",
          ),
        ]),
      });
    }

    if (
      !(SPECIES_STATUSES as readonly string[]).includes(nextStatus) ||
      !TRANSITIONS[current.status].includes(nextStatus)
    ) {
      return Object.freeze({
        valid: false,
        issues: Object.freeze([
          makeIssue(
            "INVALID_STATUS_TRANSITION",
            "status",
            `Transition from ${current.status} to ${nextStatus} is not allowed.`,
          ),
        ]),
      });
    }

    const updated: SpeciesDefinition = {
      ...current,
      status: nextStatus,
      version: current.version + 1,
    };

    this.entries.set(id, freezeSpecies(updated));
    this.catalogueVersion += 1;

    return Object.freeze({ valid: true, issues: Object.freeze([]) });
  }

  snapshot(): SpeciesCatalogueSnapshot {
    return Object.freeze({
      version: this.catalogueVersion,
      species: this.getAll(),
    });
  }
}