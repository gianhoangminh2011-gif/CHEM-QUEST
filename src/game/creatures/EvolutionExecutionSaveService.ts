
import {
  validateCreatureProfile,
  validateSpeciesReferences,
  type ContractIssue,
  type CreatureProfile,
} from "./CreatureRealmContracts";
import { SpeciesCatalogue } from "./SpeciesCatalogue";
import type { EvolutionInventoryEntry } from "./EvolutionRequirementEvaluator";

export const EVOLUTION_SAVE_SCHEMA_VERSION = 1;
export const EVOLUTION_SAVE_KEY = "chem-quest.creature-realm.evolution.v1";

export interface EvolutionExecutionSaveSnapshot {
  readonly revision: number;
  readonly profiles: readonly CreatureProfile[];
  readonly inventory: readonly EvolutionInventoryEntry[];
  readonly processedRequestIds: readonly string[];
}

export interface EvolutionExecutionSaveRecord {
  readonly schemaVersion: number;
  readonly savedAt: string;
  readonly snapshot: EvolutionExecutionSaveSnapshot;
}

export interface EvolutionExecutionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface EvolutionExecutionLoadResult {
  readonly found: boolean;
  readonly record: EvolutionExecutionSaveRecord | null;
  readonly issues: readonly ContractIssue[];
}

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function freezeProfile(
  profile: CreatureProfile,
): CreatureProfile {
  return Object.freeze({
    ...profile,
    talents: Object.freeze(
      profile.talents.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
    affinities: Object.freeze(
      profile.affinities.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
    abilities: Object.freeze(
      profile.abilities.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
  });
}

function validateSnapshot(
  value: unknown,
  catalogue: SpeciesCatalogue,
): ContractIssue[] {
  const issues: ContractIssue[] = [];

  if (!isRecord(value)) {
    return [
      makeIssue(
        "INVALID_SAVE_SNAPSHOT",
        "snapshot",
        "Save snapshot must be an object.",
      ),
    ];
  }

  if (
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 1
  ) {
    issues.push(
      makeIssue(
        "INVALID_SAVE_REVISION",
        "snapshot.revision",
        "Revision must be a positive safe integer.",
      ),
    );
  }

  if (!Array.isArray(value.profiles)) {
    issues.push(
      makeIssue(
        "INVALID_SAVE_PROFILES",
        "snapshot.profiles",
        "Profiles must be an array.",
      ),
    );
  } else {
    const ids = new Set<string>();

    value.profiles.forEach((profile, index) => {
      if (!isRecord(profile)) {
        issues.push(
          makeIssue(
            "INVALID_SAVE_PROFILE",
            `snapshot.profiles[${index}]`,
            "Profile must be an object.",
          ),
        );
        return;
      }

      const validation = validateCreatureProfile(profile);
      const references = validateSpeciesReferences(
        profile,
        catalogue.getAll(),
      );

      issues.push(
        ...validation.issues.map((entry) =>
          makeIssue(
            entry.code,
            `snapshot.profiles[${index}].${entry.path}`,
            entry.message,
          ),
        ),
        ...references.issues.map((entry) =>
          makeIssue(
            entry.code,
            `snapshot.profiles[${index}].${entry.path}`,
            entry.message,
          ),
        ),
      );

      if (typeof profile.id === "string") {
        if (ids.has(profile.id)) {
          issues.push(
            makeIssue(
              "DUPLICATE_SAVE_PROFILE_ID",
              `snapshot.profiles[${index}].id`,
              "Profile IDs must be unique.",
            ),
          );
        }
        ids.add(profile.id);
      }
    });
  }

  if (!Array.isArray(value.inventory)) {
    issues.push(
      makeIssue(
        "INVALID_SAVE_INVENTORY",
        "snapshot.inventory",
        "Inventory must be an array.",
      ),
    );
  } else {
    const ids = new Set<string>();

    value.inventory.forEach((entry, index) => {
      if (
        !isRecord(entry) ||
        typeof entry.itemId !== "string" ||
        !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(entry.itemId) ||
        !Number.isSafeInteger(entry.quantity) ||
        (entry.quantity as number) < 0
      ) {
        issues.push(
          makeIssue(
            "INVALID_SAVE_INVENTORY_ENTRY",
            `snapshot.inventory[${index}]`,
            "Inventory entry is invalid.",
          ),
        );
        return;
      }

      if (ids.has(entry.itemId)) {
        issues.push(
          makeIssue(
            "DUPLICATE_SAVE_INVENTORY_ITEM",
            `snapshot.inventory[${index}].itemId`,
            "Inventory item IDs must be unique.",
          ),
        );
      }

      ids.add(entry.itemId);
    });
  }

  if (!Array.isArray(value.processedRequestIds)) {
    issues.push(
      makeIssue(
        "INVALID_SAVE_REQUEST_IDS",
        "snapshot.processedRequestIds",
        "Processed request IDs must be an array.",
      ),
    );
  } else {
    const ids = new Set<string>();

    value.processedRequestIds.forEach((id, index) => {
      if (
        typeof id !== "string" ||
        !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(id)
      ) {
        issues.push(
          makeIssue(
            "INVALID_SAVE_REQUEST_ID",
            `snapshot.processedRequestIds[${index}]`,
            "Processed request ID is invalid.",
          ),
        );
        return;
      }

      if (ids.has(id)) {
        issues.push(
          makeIssue(
            "DUPLICATE_SAVE_REQUEST_ID",
            `snapshot.processedRequestIds[${index}]`,
            "Processed request IDs must be unique.",
          ),
        );
      }

      ids.add(id);
    });
  }

  return issues;
}

function freezeSnapshot(
  snapshot: EvolutionExecutionSaveSnapshot,
): EvolutionExecutionSaveSnapshot {
  return Object.freeze({
    revision: snapshot.revision,
    profiles: Object.freeze(
      snapshot.profiles.map(freezeProfile),
    ),
    inventory: Object.freeze(
      snapshot.inventory
        .map((entry) => Object.freeze({ ...entry }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId)),
    ),
    processedRequestIds: Object.freeze(
      [...snapshot.processedRequestIds].sort(),
    ),
  });
}

export class EvolutionExecutionSaveService {
  constructor(
    private readonly storage: EvolutionExecutionStorage,
    private readonly catalogue: SpeciesCatalogue,
    private readonly key = EVOLUTION_SAVE_KEY,
    private readonly now: () => string = () =>
      new Date().toISOString(),
  ) {}

  load(): EvolutionExecutionLoadResult {
    let raw: string | null;

    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return Object.freeze({
        found: false,
        record: null,
        issues: Object.freeze([
          makeIssue(
            "SAVE_READ_FAILED",
            "storage",
            "Could not read the evolution save.",
          ),
        ]),
      });
    }

    if (raw === null) {
      return Object.freeze({
        found: false,
        record: null,
        issues: Object.freeze([]),
      });
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return Object.freeze({
        found: true,
        record: null,
        issues: Object.freeze([
          makeIssue(
            "CORRUPTED_SAVE_JSON",
            "storage",
            "Evolution save is not valid JSON.",
          ),
        ]),
      });
    }

    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== EVOLUTION_SAVE_SCHEMA_VERSION ||
      typeof parsed.savedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.savedAt))
    ) {
      return Object.freeze({
        found: true,
        record: null,
        issues: Object.freeze([
          makeIssue(
            "UNSUPPORTED_OR_INVALID_SAVE_SCHEMA",
            "storage",
            "Save schema or timestamp is invalid.",
          ),
        ]),
      });
    }

    const issues = validateSnapshot(
      parsed.snapshot,
      this.catalogue,
    );

    if (issues.length > 0 || !isRecord(parsed.snapshot)) {
      return Object.freeze({
        found: true,
        record: null,
        issues: Object.freeze(issues),
      });
    }

    const snapshot = freezeSnapshot(
      parsed.snapshot as unknown as EvolutionExecutionSaveSnapshot,
    );

    return Object.freeze({
      found: true,
      record: Object.freeze({
        schemaVersion: EVOLUTION_SAVE_SCHEMA_VERSION,
        savedAt: parsed.savedAt,
        snapshot,
      }),
      issues: Object.freeze([]),
    });
  }

  save(snapshot: EvolutionExecutionSaveSnapshot): void {
    const issues = validateSnapshot(snapshot, this.catalogue);

    if (issues.length > 0) {
      throw new Error(
        `Invalid evolution save: ${issues
          .map((entry) => entry.code)
          .join(", ")}`,
      );
    }

    const record: EvolutionExecutionSaveRecord =
      Object.freeze({
        schemaVersion: EVOLUTION_SAVE_SCHEMA_VERSION,
        savedAt: this.now(),
        snapshot: freezeSnapshot(snapshot),
      });

    const serialized = JSON.stringify(record);

    // One storage write: never split profiles and inventory.
    this.storage.setItem(this.key, serialized);
  }
}
