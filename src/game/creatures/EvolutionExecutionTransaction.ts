import {
  type ContractIssue,
  type CreatureProfile,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";
import {
  coordinateEvolutionExecution,
  type EvolutionExecutionCoordinatorInput,
  type EvolutionExecutionCoordinatorResult,
} from "./EvolutionExecutionCoordinator";
import type {
  EvolutionRequirementEvaluation,
  EvolutionRequirementEvaluationContext,
} from "./EvolutionRequirementEvaluator";

export interface EvolutionItemCost {
  readonly itemId: string;
  readonly quantity: number;
}

export interface EvolutionExecutionTransactionPlan {
  readonly requestId: string;
  readonly creatureId: string;
  readonly profileVersion: number;
  readonly expectedProfileVersion: number;
  readonly sourceSpeciesId: string;
  readonly targetSpeciesId: string;
  readonly branchId: string;
  readonly itemCostsToConsume: readonly EvolutionItemCost[];
  readonly evaluations: readonly EvolutionRequirementEvaluation[];
}

export type EvolutionExecutionTransactionDecision =
  | "TRANSACTION_PLANNED"
  | "REJECTED_INVALID_REQUEST"
  | "REJECTED_NOT_READY"
  | "REJECTED_DUPLICATE_REQUEST"
  | "REQUIREMENTS_NOT_MET"
  | "REJECTED_PROFILE_VERSION_MISMATCH"
  | "REJECTED_INSUFFICIENT_ITEM_COST";

export interface EvolutionExecutionTransactionInput {
  readonly coordinatorInput: EvolutionExecutionCoordinatorInput;
  readonly expectedProfileVersion: number;
}

export interface EvolutionExecutionTransactionResult {
  readonly decision: EvolutionExecutionTransactionDecision;
  readonly transactionPlanned: boolean;
  readonly evolutionExecuted: false;
  readonly coordinatorResult: EvolutionExecutionCoordinatorResult;
  readonly plan: EvolutionExecutionTransactionPlan | null;
  readonly issues: readonly ContractIssue[];
}

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function makeResult(
  input: {
    decision: EvolutionExecutionTransactionDecision;
    coordinatorResult: EvolutionExecutionCoordinatorResult;
    plan?: EvolutionExecutionTransactionPlan | null;
    issues?: readonly ContractIssue[];
  },
): EvolutionExecutionTransactionResult {
  return Object.freeze({
    decision: input.decision,
    transactionPlanned:
      input.decision === "TRANSACTION_PLANNED",
    evolutionExecuted: false,
    coordinatorResult: input.coordinatorResult,
    plan: input.plan ?? null,
    issues: Object.freeze(
      (input.issues ?? []).map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
  });
}

function mapCoordinatorDecision(
  decision: EvolutionExecutionCoordinatorResult["decision"],
): EvolutionExecutionTransactionDecision {
  switch (decision) {
    case "REJECTED_INVALID_REQUEST":
      return "REJECTED_INVALID_REQUEST";
    case "REJECTED_NOT_READY":
      return "REJECTED_NOT_READY";
    case "REJECTED_DUPLICATE_REQUEST":
      return "REJECTED_DUPLICATE_REQUEST";
    case "REQUIREMENTS_NOT_MET":
      return "REQUIREMENTS_NOT_MET";
    case "READY_FOR_EXECUTION":
      return "TRANSACTION_PLANNED";
  }
}

function buildItemCosts(
  evaluations: readonly EvolutionRequirementEvaluation[],
): readonly EvolutionItemCost[] {
  const quantities = new Map<string, number>();

  for (const evaluation of evaluations) {
    if (evaluation.type !== "ITEM") {
      continue;
    }

    const match = evaluation.normalized.match(
      /^ITEM:([A-Z0-9][A-Z0-9_-]{2,63})>=(\d+)$/,
    );

    if (!match) {
      continue;
    }

    const itemId = match[1];
    const quantity = Number(match[2]);
    const total = (quantities.get(itemId) ?? 0) + quantity;

    quantities.set(itemId, total);
  }

  return Object.freeze(
    [...quantities.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([itemId, quantity]) =>
        Object.freeze({ itemId, quantity }),
      ),
  );
}

/**
 * Builds an immutable, read-only evolution transaction plan.
 *
 * This module:
 * - Re-runs the execution coordinator against the supplied snapshots.
 * - Requires the caller's expected profile version to match.
 * - Resolves the source Species, target Species, and evolution branch.
 * - Converts ITEM requirements into planned item costs.
 * - Rejects insufficient aggregate item quantities.
 * - Never creates a partial plan.
 *
 * This module does NOT:
 * - Consume inventory.
 * - Mutate Creature Profiles or Species.
 * - Update quests.
 * - Persist request IDs or transaction state.
 * - Execute evolution.
 */
export function createEvolutionExecutionTransaction(
  input: EvolutionExecutionTransactionInput,
): EvolutionExecutionTransactionResult {
  const invalidCoordinatorResult = coordinateEvolutionExecution({
    requestId: "",
    profile: null,
    species: null,
    branchId: "",
    evaluationContext: null,
  });

  if (
    typeof input !== "object" ||
    input === null ||
    !Number.isSafeInteger(input.expectedProfileVersion) ||
    input.expectedProfileVersion < 1 ||
    typeof input.coordinatorInput !== "object" ||
    input.coordinatorInput === null
  ) {
    return makeResult({
      decision: "REJECTED_INVALID_REQUEST",
      coordinatorResult: invalidCoordinatorResult,
      issues: [
        makeIssue(
          "INVALID_TRANSACTION_INPUT",
          "input",
          "Transaction input and expected profile version must be valid.",
        ),
      ],
    });
  }

  const coordinatorResult = coordinateEvolutionExecution(
    input.coordinatorInput,
  );

  if (
    coordinatorResult.decision !== "READY_FOR_EXECUTION" ||
    !coordinatorResult.approvedForExecution
  ) {
    return makeResult({
      decision: mapCoordinatorDecision(
        coordinatorResult.decision,
      ),
      coordinatorResult,
      issues: coordinatorResult.issues,
    });
  }

  const profile = input.coordinatorInput.profile as CreatureProfile;

  if (profile.version !== input.expectedProfileVersion) {
    const issue = makeIssue(
      "PROFILE_VERSION_MISMATCH",
      "expectedProfileVersion",
      "Creature Profile version does not match the expected version.",
    );

    return makeResult({
      decision: "REJECTED_PROFILE_VERSION_MISMATCH",
      coordinatorResult,
      issues: [issue],
    });
  }

  const species = input.coordinatorInput.species as SpeciesDefinition[];
  const sourceSpecies = species.find(
    (entry) => entry.id === profile.speciesId,
  );

  const branch = sourceSpecies?.evolutionBranches.find(
    (entry) => entry.id === input.coordinatorInput.branchId,
  );

  const targetSpecies = branch
    ? species.find(
        (entry) => entry.id === branch.targetSpeciesId,
      )
    : undefined;

  if (!sourceSpecies || !branch || !targetSpecies) {
    const issue = makeIssue(
      "TRANSACTION_TARGET_RESOLUTION_FAILED",
      "branchId",
      "Source Species, evolution branch, or target Species could not be resolved.",
    );

    return makeResult({
      decision: "REJECTED_NOT_READY",
      coordinatorResult,
      issues: [issue],
    });
  }

  const itemCosts = buildItemCosts(
    coordinatorResult.evaluations,
  );

  const context = input.coordinatorInput
    .evaluationContext as EvolutionRequirementEvaluationContext;

  const inventory = new Map(
    context.inventory.map((entry) => [
      entry.itemId,
      entry.quantity,
    ]),
  );

  const costIssues: ContractIssue[] = [];

  itemCosts.forEach((cost) => {
    const available = inventory.get(cost.itemId) ?? 0;

    if (available < cost.quantity) {
      costIssues.push(
        makeIssue(
          "INSUFFICIENT_ITEM_COST",
          `evaluationContext.inventory.${cost.itemId}`,
          `Required planned cost is ${cost.quantity}; available quantity is ${available}.`,
        ),
      );
    }
  });

  if (costIssues.length > 0) {
    return makeResult({
      decision: "REJECTED_INSUFFICIENT_ITEM_COST",
      coordinatorResult,
      issues: costIssues,
    });
  }

  const plan: EvolutionExecutionTransactionPlan =
    Object.freeze({
      requestId: coordinatorResult.requestId as string,
      creatureId: profile.id,
      profileVersion: profile.version,
      expectedProfileVersion: input.expectedProfileVersion,
      sourceSpeciesId: sourceSpecies.id,
      targetSpeciesId: targetSpecies.id,
      branchId: branch.id,
      itemCostsToConsume: itemCosts,
      evaluations: Object.freeze(
        coordinatorResult.evaluations.map((entry) =>
          Object.freeze({ ...entry }),
        ),
      ),
    });

  return makeResult({
    decision: "TRANSACTION_PLANNED",
    coordinatorResult,
    plan,
  });
}