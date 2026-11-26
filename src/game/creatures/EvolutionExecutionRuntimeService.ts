
import type { ContractIssue } from "./CreatureRealmContracts";
import { SpeciesCatalogue } from "./SpeciesCatalogue";
import {
  createEvolutionExecutionTransaction,
  type EvolutionExecutionTransactionResult,
} from "./EvolutionExecutionTransaction";
import {
  EvolutionExecutionAtomicStore,
  type EvolutionExecutionRuntimeContext,
  type EvolutionAtomicExecutionResult,
} from "./EvolutionExecutionAtomicStore";

export interface EvolutionExecutionRuntimeRequest {
  readonly requestId: string;
  readonly creatureId: string;
  readonly branchId: string;
  readonly executedAt: string;
  readonly runtimeContext: EvolutionExecutionRuntimeContext;
}

export type EvolutionExecutionRuntimeDecision =
  | "EXECUTED"
  | "REJECTED_INVALID_REQUEST"
  | "REJECTED_CREATURE_NOT_FOUND"
  | "REJECTED_TRANSACTION"
  | "REJECTED_ATOMIC_EXECUTION"
  | "REJECTED_PERSISTENCE_FAILURE";

export interface EvolutionExecutionRuntimeResult {
  readonly decision: EvolutionExecutionRuntimeDecision;
  readonly executed: boolean;
  readonly requestId: string | null;
  readonly transaction: EvolutionExecutionTransactionResult | null;
  readonly execution: EvolutionAtomicExecutionResult | null;
  readonly issues: readonly ContractIssue[];
}

const ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function makeResult(input: {
  decision: EvolutionExecutionRuntimeDecision;
  requestId?: string | null;
  transaction?: EvolutionExecutionTransactionResult | null;
  execution?: EvolutionAtomicExecutionResult | null;
  issues?: readonly ContractIssue[];
}): EvolutionExecutionRuntimeResult {
  return Object.freeze({
    decision: input.decision,
    executed: input.decision === "EXECUTED",
    requestId: input.requestId ?? null,
    transaction: input.transaction ?? null,
    execution: input.execution ?? null,
    issues: Object.freeze([...(input.issues ?? [])]),
  });
}

/**
 * Coordinates the complete Creature Realm evolution runtime flow.
 *
 * Responsibilities:
 * - Resolve the current Creature Profile.
 * - Build a planning context from the current atomic inventory.
 * - Detect previously processed request IDs.
 * - Create a validated evolution transaction.
 * - Submit the plan to the atomic execution store.
 * - Return one normalized runtime result.
 *
 * This service does not directly mutate profiles, inventory,
 * quests, or persistence. All state mutation is delegated to
 * EvolutionExecutionAtomicStore.
 */
export class EvolutionExecutionRuntimeService {
  constructor(
    private readonly catalogue: SpeciesCatalogue,
    private readonly store: EvolutionExecutionAtomicStore,
  ) {}

  execute(
    request: EvolutionExecutionRuntimeRequest,
  ): EvolutionExecutionRuntimeResult {
    if (
      !request ||
      typeof request !== "object" ||
      !ID_PATTERN.test(request.requestId) ||
      !ID_PATTERN.test(request.creatureId) ||
      !ID_PATTERN.test(request.branchId) ||
      typeof request.executedAt !== "string" ||
      Number.isNaN(Date.parse(request.executedAt)) ||
      !request.runtimeContext ||
      typeof request.runtimeContext !== "object" ||
      !Number.isSafeInteger(request.runtimeContext.level) ||
      request.runtimeContext.level < 1 ||
      !Array.isArray(request.runtimeContext.completedQuestIds) ||
      !Array.isArray(request.runtimeContext.affinities)
    ) {
      return makeResult({
        decision: "REJECTED_INVALID_REQUEST",
        requestId:
          typeof request?.requestId === "string"
            ? request.requestId
            : null,
        issues: [
          makeIssue(
            "INVALID_RUNTIME_REQUEST",
            "request",
            "Runtime request, identifiers, timestamp, or context is invalid.",
          ),
        ],
      });
    }

    const profile = this.store.getProfile(request.creatureId);

    if (!profile) {
      return makeResult({
        decision: "REJECTED_CREATURE_NOT_FOUND",
        requestId: request.requestId,
        issues: [
          makeIssue(
            "CREATURE_NOT_FOUND",
            "creatureId",
            "Creature Profile does not exist in the atomic store.",
          ),
        ],
      });
    }

    const currentSnapshot = this.store.snapshot();

    const transaction = createEvolutionExecutionTransaction({
      expectedProfileVersion: profile.version,
      coordinatorInput: {
        requestId: request.requestId,
        profile,
        species: this.catalogue.getAll(),
        branchId: request.branchId,
        processedRequestIds: currentSnapshot.processedRequestIds,
        evaluationContext: {
          level: request.runtimeContext.level,
          cultivationRealm: profile.cultivationRealm,
          inventory: this.store.getInventory(),
          completedQuestIds:
            request.runtimeContext.completedQuestIds,
          affinities: request.runtimeContext.affinities,
        },
      },
    });

    if (!transaction.plan) {
      return makeResult({
        decision: "REJECTED_TRANSACTION",
        requestId: request.requestId,
        transaction,
        issues: transaction.issues.length > 0
          ? transaction.issues
          : transaction.coordinatorResult.issues,
      });
    }

    const execution = this.store.execute(
      transaction.plan,
      request.executedAt,
      request.runtimeContext,
    );

    if (execution.decision === "EXECUTED") {
      return makeResult({
        decision: "EXECUTED",
        requestId: request.requestId,
        transaction,
        execution,
        issues: [],
      });
    }

    if (execution.decision === "REJECTED_PERSISTENCE_FAILURE") {
      return makeResult({
        decision: "REJECTED_PERSISTENCE_FAILURE",
        requestId: request.requestId,
        transaction,
        execution,
        issues: execution.issues,
      });
    }

    return makeResult({
      decision: "REJECTED_ATOMIC_EXECUTION",
      requestId: request.requestId,
      transaction,
      execution,
      issues: execution.issues,
    });
  }
}
