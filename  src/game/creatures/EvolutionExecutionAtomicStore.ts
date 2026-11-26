
import {
  EVOLUTION_STAGES,
  validateSpeciesReferences,
  type ContractIssue,
  type CreatureProfile,
} from "./CreatureRealmContracts";
import { SpeciesCatalogue } from "./SpeciesCatalogue";
import type {
  EvolutionExecutionTransactionPlan,
} from "./EvolutionExecutionTransaction";
import type {
  EvolutionInventoryEntry,
} from "./EvolutionRequirementEvaluator";

export type EvolutionAtomicExecutionDecision =
  | "EXECUTED"
  | "REJECTED_INVALID_PLAN"
  | "REJECTED_CREATURE_NOT_FOUND"
  | "REJECTED_PROFILE_VERSION_CONFLICT"
  | "REJECTED_SOURCE_SPECIES_CONFLICT"
  | "REJECTED_BRANCH_CONFLICT"
  | "REJECTED_TARGET_SPECIES_NOT_FOUND"
  | "REJECTED_INSUFFICIENT_INVENTORY"
  | "REJECTED_MAX_EVOLUTION_STAGE"
  | "REJECTED_DUPLICATE_REQUEST";

export interface EvolutionAtomicExecutionResult {
  readonly decision: EvolutionAtomicExecutionDecision;
  readonly executed: boolean;
  readonly requestId: string | null;
  readonly profile: CreatureProfile | null;
  readonly inventory: readonly EvolutionInventoryEntry[];
  readonly issues: readonly ContractIssue[];
  readonly stateRevision: number;
}

export interface EvolutionAtomicStoreSnapshot {
  readonly revision: number;
  readonly profiles: readonly CreatureProfile[];
  readonly inventory: readonly EvolutionInventoryEntry[];
  readonly processedRequestIds: readonly string[];
}

interface AtomicState {
  readonly revision: number;
  readonly profiles: Map<string, CreatureProfile>;
  readonly inventory: Map<string, number>;
  readonly processedRequestIds: Set<string>;
}

export interface EvolutionExecutionAtomicStoreInput {
  readonly speciesCatalogue: SpeciesCatalogue;
  readonly profiles: readonly CreatureProfile[];
  readonly inventory: readonly EvolutionInventoryEntry[];
}

function issue(
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

function freezeInventory(
  inventory: Map<string, number>,
): readonly EvolutionInventoryEntry[] {
  return Object.freeze(
    [...inventory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([itemId, quantity]) =>
        Object.freeze({ itemId, quantity }),
      ),
  );
}

function makeResult(input: {
  decision: EvolutionAtomicExecutionDecision;
  requestId?: string | null;
  profile?: CreatureProfile | null;
  inventory: Map<string, number>;
  issues?: readonly ContractIssue[];
  revision: number;
}): EvolutionAtomicExecutionResult {
  return Object.freeze({
    decision: input.decision,
    executed: input.decision === "EXECUTED",
    requestId: input.requestId ?? null,
    profile: input.profile ?? null,
    inventory: freezeInventory(input.inventory),
    issues: Object.freeze([...(input.issues ?? [])]),
    stateRevision: input.revision,
  });
}

/**
 * In-memory atomic evolution store.
 *
 * Profile, ITEM inventory and processed request IDs live inside
 * one immutable state reference. Execution builds replacement Maps
 * first and publishes them through one state-reference assignment.
 *
 * Guarantees:
 * - No profile update if any inventory check fails.
 * - No inventory deduction if profile validation fails.
 * - Profile version is checked again at execution time.
 * - Request IDs cannot execute twice within this store instance.
 *
 * Limitations:
 * - State is in memory only.
 * - State is lost when this instance/process is destroyed.
 * - This is not a database transaction and does not coordinate
 *   multiple processes or server instances.
 *
 * The store is intentionally independent of
 * CreatureProfileRegistry and InventoryTransactionService.
 * Do not update those services separately for this transaction.
 */
export class EvolutionExecutionAtomicStore {
  private state: AtomicState;

  constructor(
    private readonly speciesCatalogue: SpeciesCatalogue,
    profiles: readonly CreatureProfile[],
    inventory: readonly EvolutionInventoryEntry[],
  ) {
    const profileMap = new Map<string, CreatureProfile>();
    const inventoryMap = new Map<string, number>();
    const issues: ContractIssue[] = [];

    for (const profile of profiles) {
      if (profileMap.has(profile.id)) {
        issues.push(
          issue(
            "DUPLICATE_CREATURE_ID",
            "profiles",
            `Duplicate Creature ID: ${profile.id}.`,
          ),
        );
        continue;
      }

      const validation = validateSpeciesReferences(
        profile,
        speciesCatalogue.getAll(),
      );

      issues.push(...validation.issues);
      profileMap.set(profile.id, freezeProfile(profile));
    }

    for (const entry of inventory) {
      if (
        typeof entry.itemId !== "string" ||
        !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(entry.itemId) ||
        !Number.isSafeInteger(entry.quantity) ||
        entry.quantity < 0
      ) {
        issues.push(
          issue(
            "INVALID_INVENTORY_ENTRY",
            "inventory",
            "Inventory requires valid item IDs and non-negative safe integer quantities.",
          ),
        );
        continue;
      }

      if (inventoryMap.has(entry.itemId)) {
        issues.push(
          issue(
            "DUPLICATE_INVENTORY_ITEM",
            "inventory",
            `Duplicate inventory item: ${entry.itemId}.`,
          ),
        );
        continue;
      }

      inventoryMap.set(entry.itemId, entry.quantity);
    }

    if (issues.length > 0) {
      throw new Error(
        `Invalid Evolution Atomic Store: ${issues
          .map((entry) => entry.code)
          .join(", ")}`,
      );
    }

    this.state = Object.freeze({
      revision: 1,
      profiles: profileMap,
      inventory: inventoryMap,
      processedRequestIds: new Set<string>(),
    });
  }

  getProfile(creatureId: string): CreatureProfile | undefined {
    return this.state.profiles.get(creatureId);
  }

  getInventory(): readonly EvolutionInventoryEntry[] {
    return freezeInventory(this.state.inventory);
  }

  get revision(): number {
    return this.state.revision;
  }

  snapshot(): EvolutionAtomicStoreSnapshot {
    return Object.freeze({
      revision: this.state.revision,
      profiles: Object.freeze([
        ...this.state.profiles.values(),
      ]),
      inventory: freezeInventory(this.state.inventory),
      processedRequestIds: Object.freeze([
        ...this.state.processedRequestIds,
      ].sort()),
    });
  }

  execute(
    plan: EvolutionExecutionTransactionPlan,
    executedAt: string,
  ): EvolutionAtomicExecutionResult {
    const currentState = this.state;

    const reject = (
      decision: EvolutionAtomicExecutionDecision,
      code: string,
      path: string,
      message: string,
    ): EvolutionAtomicExecutionResult =>
      makeResult({
        decision,
        requestId:
          typeof plan?.requestId === "string"
            ? plan.requestId
            : null,
        profile: null,
        inventory: currentState.inventory,
        issues: [issue(code, path, message)],
        revision: currentState.revision,
      });

    if (
      typeof plan !== "object" ||
      plan === null ||
      typeof plan.requestId !== "string" ||
      !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(plan.requestId) ||
      typeof plan.creatureId !== "string" ||
      typeof plan.sourceSpeciesId !== "string" ||
      typeof plan.targetSpeciesId !== "string" ||
      typeof plan.branchId !== "string" ||
      !Number.isSafeInteger(plan.profileVersion) ||
      !Number.isSafeInteger(plan.expectedProfileVersion) ||
      plan.profileVersion < 1 ||
      plan.expectedProfileVersion < 1 ||
      !Array.isArray(plan.itemCostsToConsume) ||
      !Array.isArray(plan.evaluations) ||
      typeof executedAt !== "string" ||
      Number.isNaN(Date.parse(executedAt))
    ) {
      return reject(
        "REJECTED_INVALID_PLAN",
        "INVALID_EVOLUTION_PLAN",
        "plan",
        "Evolution plan or execution timestamp is invalid.",
      );
    }

    if (currentState.processedRequestIds.has(plan.requestId)) {
      return reject(
        "REJECTED_DUPLICATE_REQUEST",
        "DUPLICATE_REQUEST",
        "requestId",
        "This request has already been executed by this store.",
      );
    }

    const currentProfile = currentState.profiles.get(
      plan.creatureId,
    );

    if (!currentProfile) {
      return reject(
        "REJECTED_CREATURE_NOT_FOUND",
        "CREATURE_NOT_FOUND",
        "creatureId",
        "Creature Profile does not exist in the atomic store.",
      );
    }

    if (
      currentProfile.version !== plan.profileVersion ||
      currentProfile.version !== plan.expectedProfileVersion
    ) {
      return reject(
        "REJECTED_PROFILE_VERSION_CONFLICT",
        "PROFILE_VERSION_CONFLICT",
        "profileVersion",
        "The current Creature Profile version no longer matches the plan.",
      );
    }

    if (currentProfile.speciesId !== plan.sourceSpeciesId) {
      return reject(
        "REJECTED_SOURCE_SPECIES_CONFLICT",
        "SOURCE_SPECIES_CONFLICT",
        "sourceSpeciesId",
        "Creature Profile no longer has the planned source Species.",
      );
    }

    const sourceSpecies = this.speciesCatalogue.getById(
      plan.sourceSpeciesId,
    );

    const branch = sourceSpecies?.evolutionBranches.find(
      (entry) => entry.id === plan.branchId,
    );

    if (!sourceSpecies || !branch) {
      return reject(
        "REJECTED_BRANCH_CONFLICT",
        "BRANCH_NOT_FOUND",
        "branchId",
        "The planned evolution branch no longer exists.",
      );
    }

    if (branch.targetSpeciesId !== plan.targetSpeciesId) {
      return reject(
        "REJECTED_BRANCH_CONFLICT",
        "BRANCH_TARGET_CONFLICT",
        "targetSpeciesId",
        "The branch target does not match the transaction plan.",
      );
    }

    const targetSpecies = this.speciesCatalogue.getById(
      plan.targetSpeciesId,
    );

    if (!targetSpecies) {
      return reject(
        "REJECTED_TARGET_SPECIES_NOT_FOUND",
        "TARGET_SPECIES_NOT_FOUND",
        "targetSpeciesId",
        "Target Species does not exist in the catalogue.",
      );
    }

    const nextStageIndex = EVOLUTION_STAGES.indexOf(
      currentProfile.evolutionStage,
    ) + 1;

    if (
      nextStageIndex <= 0 ||
      nextStageIndex >= EVOLUTION_STAGES.length
    ) {
      return reject(
        "REJECTED_MAX_EVOLUTION_STAGE",
        "MAX_EVOLUTION_STAGE",
        "evolutionStage",
        "Creature has already reached the maximum evolution stage.",
      );
    }

    const aggregatedCosts = new Map<string, number>();

    for (const cost of plan.itemCostsToConsume) {
      if (
        typeof cost.itemId !== "string" ||
        !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(cost.itemId) ||
        !Number.isSafeInteger(cost.quantity) ||
        cost.quantity < 1
      ) {
        return reject(
          "REJECTED_INVALID_PLAN",
          "INVALID_ITEM_COST",
          "itemCostsToConsume",
          "Every item cost must have a valid ID and positive safe integer quantity.",
        );
      }

      const total =
        (aggregatedCosts.get(cost.itemId) ?? 0) +
        cost.quantity;

      if (!Number.isSafeInteger(total)) {
        return reject(
          "REJECTED_INVALID_PLAN",
          "ITEM_COST_OVERFLOW",
          "itemCostsToConsume",
          "Aggregated item cost exceeds the safe integer range.",
        );
      }

      aggregatedCosts.set(cost.itemId, total);
    }

    const nextInventory = new Map(currentState.inventory);

    for (const [itemId, quantity] of aggregatedCosts) {
      const available = nextInventory.get(itemId) ?? 0;

      if (available < quantity) {
        return reject(
          "REJECTED_INSUFFICIENT_INVENTORY",
          "INSUFFICIENT_INVENTORY",
          `inventory.${itemId}`,
          `Required ${quantity}; available ${available}.`,
        );
      }

      nextInventory.set(itemId, available - quantity);
    }

    const nextProfile = freezeProfile({
      ...currentProfile,
      speciesId: targetSpecies.id,
      evolutionStage: EVOLUTION_STAGES[nextStageIndex],
      updatedAt: executedAt,
      version: currentProfile.version + 1,
    });

    const nextProfiles = new Map(currentState.profiles);
    nextProfiles.set(nextProfile.id, nextProfile);

    const nextProcessedIds = new Set(
      currentState.processedRequestIds,
    );
    nextProcessedIds.add(plan.requestId);

    const nextState: AtomicState = Object.freeze({
      revision: currentState.revision + 1,
      profiles: nextProfiles,
      inventory: nextInventory,
      processedRequestIds: nextProcessedIds,
    });

    // Single publication point: observers see either the old
    // state or the complete new state, never an intermediate state.
    this.state = nextState;

    return makeResult({
      decision: "EXECUTED",
      requestId: plan.requestId,
      profile: nextProfile,
      inventory: nextInventory,
      revision: nextState.revision,
    });
  }
}
