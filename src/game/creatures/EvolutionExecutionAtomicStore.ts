import {
  EVOLUTION_STAGES,
  validateCreatureProfile,
  validateSpeciesReferences,
  type ContractIssue,
  type CreatureProfile,
} from "./CreatureRealmContracts";
import { SpeciesCatalogue } from "./SpeciesCatalogue";
import type {
  EvolutionExecutionTransactionPlan,
  EvolutionItemCost,
} from "./EvolutionExecutionTransaction";
import {
  evaluateEvolutionRequirements,
  type EvolutionAffinityEntry,
  type EvolutionInventoryEntry,
  type EvolutionRequirementEvaluation,
} from "./EvolutionRequirementEvaluator";
import type {
  EvolutionExecutionSaveService,
} from "./EvolutionExecutionSaveService";

export interface EvolutionExecutionRuntimeContext {
  readonly level: number;
  readonly completedQuestIds: readonly string[];
  readonly affinities: readonly EvolutionAffinityEntry[];
}

export type EvolutionAtomicExecutionDecision =
  | "EXECUTED"
  | "REJECTED_INVALID_PLAN"
  | "REJECTED_INVALID_CONTEXT"
  | "REJECTED_CREATURE_NOT_FOUND"
  | "REJECTED_PROFILE_VERSION_CONFLICT"
  | "REJECTED_SOURCE_SPECIES_CONFLICT"
  | "REJECTED_BRANCH_CONFLICT"
  | "REJECTED_TARGET_SPECIES_NOT_FOUND"
  | "REJECTED_REQUIREMENTS_NOT_MET"
  | "REJECTED_INSUFFICIENT_INVENTORY"
  | "REJECTED_MAX_EVOLUTION_STAGE"
  | "REJECTED_DUPLICATE_REQUEST"
  | "REJECTED_PERSISTENCE_FAILURE";

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

const ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;

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
      profile.talents.map((entry) => Object.freeze({ ...entry })),
    ),
    affinities: Object.freeze(
      profile.affinities.map((entry) => Object.freeze({ ...entry })),
    ),
    abilities: Object.freeze(
      profile.abilities.map((entry) => Object.freeze({ ...entry })),
    ),
  });
}

function freezeInventory(
  inventory: Map<string, number>,
): readonly EvolutionInventoryEntry[] {
  return Object.freeze(
    [...inventory.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
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

function sameEvaluations(
  supplied: readonly EvolutionRequirementEvaluation[],
  actual: readonly EvolutionRequirementEvaluation[],
): boolean {
  if (supplied.length !== actual.length) {
    return false;
  }

  return supplied.every((entry, index) => {
    const expected = actual[index];

    return (
      entry.requirement === expected.requirement &&
      entry.normalized === expected.normalized &&
      entry.type === expected.type &&
      entry.met === expected.met
    );
  });
}

function buildItemCosts(
  evaluations: readonly EvolutionRequirementEvaluation[],
): readonly EvolutionItemCost[] | null {
  const totals = new Map<string, number>();

  for (const evaluation of evaluations) {
    if (evaluation.type !== "ITEM") {
      continue;
    }

    const match = evaluation.normalized.match(
      /^ITEM:([A-Z0-9][A-Z0-9_-]{2,63})>=(\d+)$/,
    );

    if (!match) {
      return null;
    }

    const itemId = match[1];
    const quantity = Number(match[2]);

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return null;
    }

    const total = (totals.get(itemId) ?? 0) + quantity;

    if (!Number.isSafeInteger(total)) {
      return null;
    }

    totals.set(itemId, total);
  }

  return Object.freeze(
    [...totals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([itemId, quantity]) =>
        Object.freeze({ itemId, quantity }),
      ),
  );
}

function sameCosts(
  supplied: readonly EvolutionItemCost[],
  actual: readonly EvolutionItemCost[],
): boolean {
  if (supplied.length !== actual.length) {
    return false;
  }

  const normalized = [...supplied].sort((a, b) =>
    a.itemId.localeCompare(b.itemId),
  );

  return normalized.every((entry, index) => {
    const expected = actual[index];

    return (
      entry.itemId === expected.itemId &&
      entry.quantity === expected.quantity
    );
  });
}

export class EvolutionExecutionAtomicStore {
  private state: AtomicState;

  constructor(
    private readonly speciesCatalogue: SpeciesCatalogue,
    profiles: readonly CreatureProfile[],
    inventory: readonly EvolutionInventoryEntry[],
    private readonly saveService?: EvolutionExecutionSaveService,
  ) {
    const loaded = this.saveService?.load();

    if (loaded?.issues.length) {
      throw new Error(
        `Evolution persistence load failed: ${loaded.issues
          .map((entry) => entry.code)
          .join(", ")}`,
      );
    }

    if (loaded?.found && loaded.snapshot) {
      this.state = this.restoreSnapshot(loaded.snapshot);
      return;
    }

    this.state = this.createInitialState(profiles, inventory);
  }

  private createInitialState(
    profiles: readonly CreatureProfile[],
    inventory: readonly EvolutionInventoryEntry[],
  ): AtomicState {
    const profileMap = new Map<string, CreatureProfile>();
    const inventoryMap = new Map<string, number>();
    const issues: ContractIssue[] = [];

    for (const profile of profiles) {
      if (
        !profile ||
        typeof profile.id !== "string" ||
        profileMap.has(profile.id)
      ) {
        issues.push(
          issue(
            "DUPLICATE_OR_INVALID_CREATURE_ID",
            "profiles",
            "Every Creature Profile must have a unique valid ID.",
          ),
        );
        continue;
      }

      const profileValidation = validateCreatureProfile(profile);
      const referenceValidation = validateSpeciesReferences(
        profile,
        this.speciesCatalogue.getAll(),
      );

      issues.push(...profileValidation.issues);
      issues.push(...referenceValidation.issues);

      if (profileValidation.valid && referenceValidation.valid) {
        profileMap.set(profile.id, freezeProfile(profile));
      }
    }

    for (const entry of inventory) {
      if (
        !entry ||
        typeof entry.itemId !== "string" ||
        !ID_PATTERN.test(entry.itemId) ||
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

    return Object.freeze({
      revision: 1,
      profiles: profileMap,
      inventory: inventoryMap,
      processedRequestIds: new Set<string>(),
    });
  }

  private restoreSnapshot(
    snapshot: EvolutionAtomicStoreSnapshot,
  ): AtomicState {
    if (
      !snapshot ||
      !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision < 1 ||
      !Array.isArray(snapshot.profiles) ||
      !Array.isArray(snapshot.inventory) ||
      !Array.isArray(snapshot.processedRequestIds)
    ) {
      throw new Error("Persisted evolution snapshot is invalid.");
    }

    const restored = this.createInitialState(
      snapshot.profiles,
      snapshot.inventory,
    );

    const requestIds = new Set<string>();

    for (const requestId of snapshot.processedRequestIds) {
      if (
        typeof requestId !== "string" ||
        !ID_PATTERN.test(requestId) ||
        requestIds.has(requestId)
      ) {
        throw new Error("Persisted processed request IDs are invalid.");
      }

      requestIds.add(requestId);
    }

    return Object.freeze({
      revision: snapshot.revision,
      profiles: restored.profiles,
      inventory: restored.inventory,
      processedRequestIds: requestIds,
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
      profiles: Object.freeze([...this.state.profiles.values()]),
      inventory: freezeInventory(this.state.inventory),
      processedRequestIds: Object.freeze(
        [...this.state.processedRequestIds].sort(),
      ),
    });
  }

  execute(
    plan: EvolutionExecutionTransactionPlan,
    executedAt: string,
    runtimeContext: EvolutionExecutionRuntimeContext,
  ): EvolutionAtomicExecutionResult {
    const currentState = this.state;

    const requestId =
      typeof plan?.requestId === "string" ? plan.requestId : null;

    const reject = (
      decision: EvolutionAtomicExecutionDecision,
      code: string,
      path: string,
      message: string,
    ): EvolutionAtomicExecutionResult =>
      makeResult({
        decision,
        requestId,
        inventory: currentState.inventory,
        issues: [issue(code, path, message)],
        revision: currentState.revision,
      });

    if (
      !plan ||
      typeof plan !== "object" ||
      !requestId ||
      !ID_PATTERN.test(requestId) ||
      typeof plan.creatureId !== "string" ||
      !ID_PATTERN.test(plan.creatureId) ||
      typeof plan.sourceSpeciesId !== "string" ||
      !ID_PATTERN.test(plan.sourceSpeciesId) ||
      typeof plan.targetSpeciesId !== "string" ||
      !ID_PATTERN.test(plan.targetSpeciesId) ||
      typeof plan.branchId !== "string" ||
      !ID_PATTERN.test(plan.branchId) ||
      !Number.isSafeInteger(plan.profileVersion) ||
      plan.profileVersion < 1 ||
      !Number.isSafeInteger(plan.expectedProfileVersion) ||
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

    if (currentState.processedRequestIds.has(requestId)) {
      return reject(
        "REJECTED_DUPLICATE_REQUEST",
        "DUPLICATE_REQUEST",
        "requestId",
        "This request has already been executed by this store.",
      );
    }

    const currentProfile = currentState.profiles.get(plan.creatureId);

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
        "Current Creature Profile version does not match the plan.",
      );
    }

    if (currentProfile.speciesId !== plan.sourceSpeciesId) {
      return reject(
        "REJECTED_SOURCE_SPECIES_CONFLICT",
        "SOURCE_SPECIES_CONFLICT",
        "sourceSpeciesId",
        "Current Creature Species differs from the plan.",
      );
    }

    const sourceSpecies = this.speciesCatalogue.getById(
      plan.sourceSpeciesId,
    );

    if (!sourceSpecies) {
      return reject(
        "REJECTED_BRANCH_CONFLICT",
        "SOURCE_SPECIES_NOT_FOUND",
        "sourceSpeciesId",
        "Source Species no longer exists.",
      );
    }

    const branch = sourceSpecies.evolutionBranches.find(
      (entry) => entry.id === plan.branchId,
    );

    if (!branch || branch.targetSpeciesId !== plan.targetSpeciesId) {
      return reject(
        "REJECTED_BRANCH_CONFLICT",
        "BRANCH_CONFLICT",
        "branchId",
        "The selected branch is missing or its target differs from the plan.",
      );
    }

    const targetSpecies = this.speciesCatalogue.getById(
      branch.targetSpeciesId,
    );

    if (!targetSpecies) {
      return reject(
        "REJECTED_TARGET_SPECIES_NOT_FOUND",
        "TARGET_SPECIES_NOT_FOUND",
        "targetSpeciesId",
        "Target Species no longer exists.",
      );
    }

    if (
      !runtimeContext ||
      typeof runtimeContext !== "object" ||
      !Array.isArray(runtimeContext.completedQuestIds) ||
      !Array.isArray(runtimeContext.affinities)
    ) {
      return reject(
        "REJECTED_INVALID_CONTEXT",
        "INVALID_RUNTIME_CONTEXT",
        "runtimeContext",
        "Runtime progression context is required for re-evaluation.",
      );
    }

    const currentInventory = freezeInventory(currentState.inventory);

    const evaluation = evaluateEvolutionRequirements(
      branch.requirements,
      {
        level: runtimeContext.level,
        cultivationRealm: currentProfile.cultivationRealm,
        inventory: currentInventory,
        completedQuestIds: runtimeContext.completedQuestIds,
        affinities: runtimeContext.affinities,
      },
    );

    if (evaluation.inputErrors.length > 0) {
      return makeResult({
        decision: "REJECTED_INVALID_CONTEXT",
        requestId,
        inventory: currentState.inventory,
        issues: evaluation.inputErrors,
        revision: currentState.revision,
      });
    }

    if (!evaluation.requirementsMet) {
      return reject(
        "REJECTED_REQUIREMENTS_NOT_MET",
        "EVOLUTION_REQUIREMENTS_NOT_MET",
        "branch.requirements",
        "One or more evolution requirements are no longer satisfied.",
      );
    }

    if (!sameEvaluations(plan.evaluations, evaluation.evaluations)) {
      return reject(
        "REJECTED_INVALID_PLAN",
        "PLAN_EVALUATION_MISMATCH",
        "evaluations",
        "Plan evaluations do not match the current requirement evaluation.",
      );
    }

    const expectedCosts = buildItemCosts(evaluation.evaluations);

    if (
      expectedCosts === null ||
      !sameCosts(plan.itemCostsToConsume, expectedCosts)
    ) {
      return reject(
        "REJECTED_INVALID_PLAN",
        "PLAN_ITEM_COST_MISMATCH",
        "itemCostsToConsume",
        "Plan item costs do not match the current branch requirements.",
      );
    }

    const nextStageIndex =
      EVOLUTION_STAGES.indexOf(currentProfile.evolutionStage) + 1;

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

    const nextInventory = new Map(currentState.inventory);

    for (const cost of expectedCosts) {
      const available = nextInventory.get(cost.itemId) ?? 0;

      if (available < cost.quantity) {
        return reject(
          "REJECTED_INSUFFICIENT_INVENTORY",
          "INSUFFICIENT_INVENTORY",
          `inventory.${cost.itemId}`,
          `Required ${cost.quantity}; available ${available}.`,
        );
      }

      nextInventory.set(cost.itemId, available - cost.quantity);
    }

    if (!Number.isSafeInteger(currentProfile.version + 1)) {
      return reject(
        "REJECTED_INVALID_PLAN",
        "PROFILE_VERSION_OVERFLOW",
        "profile.version",
        "The next Profile version exceeds the safe integer range.",
      );
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

    const nextProcessedRequestIds = new Set(
      currentState.processedRequestIds,
    );
    nextProcessedRequestIds.add(requestId);

    const nextState: AtomicState = Object.freeze({
      revision: currentState.revision + 1,
      profiles: nextProfiles,
      inventory: nextInventory,
      processedRequestIds: nextProcessedRequestIds,
    });

    if (this.saveService) {
      try {
        this.saveService.save({
          revision: nextState.revision,
          profiles: Object.freeze([...nextState.profiles.values()]),
          inventory: freezeInventory(nextState.inventory),
          processedRequestIds: Object.freeze(
            [...nextState.processedRequestIds].sort(),
          ),
        });
      } catch {
        return reject(
          "REJECTED_PERSISTENCE_FAILURE",
          "EVOLUTION_PERSISTENCE_WRITE_FAILED",
          "persistence",
          "Evolution state could not be saved; in-memory state was not changed.",
        );
      }
    }

    // Publish only after durable persistence succeeds.
    this.state = nextState;

    return makeResult({
      decision: "EXECUTED",
      requestId,
      profile: nextProfile,
      inventory: nextInventory,
      revision: nextState.revision,
    });
  }
}