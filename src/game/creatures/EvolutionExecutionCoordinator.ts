import {
  validateCreatureProfile,
  type ContractIssue,
  type CreatureProfile,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";
import {
  validateEvolutionExecutionReadiness,
} from "./EvolutionExecutionReadiness";
import {
  evaluateEvolutionRequirements,
  type EvolutionRequirementEvaluation,
  type EvolutionRequirementEvaluationContext,
} from "./EvolutionRequirementEvaluator";

export type EvolutionExecutionDecision =
  | "REJECTED_INVALID_REQUEST"
  | "REJECTED_NOT_READY"
  | "REJECTED_DUPLICATE_REQUEST"
  | "REQUIREMENTS_NOT_MET"
  | "READY_FOR_EXECUTION";

export interface EvolutionExecutionCoordinatorInput {
  requestId: string;
  profile: unknown;
  species: unknown;
  branchId: string;
  evaluationContext: unknown;
  processedRequestIds?: readonly string[];
}

export interface EvolutionExecutionCoordinatorResult {
  requestId: string | null;
  decision: EvolutionExecutionDecision;
  approvedForExecution: boolean;
  requirementsMet: boolean | null;
  readinessChecked: boolean;
  requirementsEvaluated: boolean;
  evolutionExecuted: false;
  evaluations: readonly EvolutionRequirementEvaluation[];
  issues: readonly ContractIssue[];
}

const ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function makeResult(
  input: {
    requestId: string | null;
    decision: EvolutionExecutionDecision;
    requirementsMet?: boolean | null;
    readinessChecked?: boolean;
    requirementsEvaluated?: boolean;
    evaluations?: readonly EvolutionRequirementEvaluation[];
    issues?: readonly ContractIssue[];
  },
): EvolutionExecutionCoordinatorResult {
  return Object.freeze({
    requestId: input.requestId,
    decision: input.decision,
    approvedForExecution:
      input.decision === "READY_FOR_EXECUTION",
    requirementsMet: input.requirementsMet ?? null,
    readinessChecked: input.readinessChecked ?? false,
    requirementsEvaluated: input.requirementsEvaluated ?? false,
    evolutionExecuted: false,
    evaluations: Object.freeze(
      (input.evaluations ?? []).map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
    issues: Object.freeze(
      (input.issues ?? []).map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
  });
}

/**
 * Coordinates readiness validation and requirement evaluation.
 *
 * This module is intentionally read-only:
 * - Does not mutate Creature Profiles.
 * - Does not consume inventory.
 * - Does not update quest progress.
 * - Does not unlock or modify Species.
 * - Does not persist request IDs or execution state.
 * - Does not execute evolution.
 *
 * Duplicate detection is based on the caller-supplied
 * processedRequestIds snapshot. The coordinator itself is stateless.
 */
export function coordinateEvolutionExecution(
  input: EvolutionExecutionCoordinatorInput,
): EvolutionExecutionCoordinatorResult {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return makeResult({
      requestId: null,
      decision: "REJECTED_INVALID_REQUEST",
      issues: [
        makeIssue(
          "INVALID_COORDINATOR_INPUT",
          "input",
          "Coordinator input must be an object.",
        ),
      ],
    });
  }

  const requestId =
    typeof input.requestId === "string"
      ? input.requestId
      : null;

  const issues: ContractIssue[] = [];

  if (
    requestId === null ||
    !ID_PATTERN.test(requestId)
  ) {
    issues.push(
      makeIssue(
        "INVALID_REQUEST_ID",
        "requestId",
        "Request ID must use the supported identifier format.",
      ),
    );
  }

  if (
    typeof input.branchId !== "string" ||
    !ID_PATTERN.test(input.branchId)
  ) {
    issues.push(
      makeIssue(
        "INVALID_BRANCH_ID",
        "branchId",
        "Branch ID must use the supported identifier format.",
      ),
    );
  }

  if (
    input.processedRequestIds !== undefined &&
    !Array.isArray(input.processedRequestIds)
  ) {
    issues.push(
      makeIssue(
        "INVALID_PROCESSED_REQUEST_IDS",
        "processedRequestIds",
        "Processed request IDs must be an array.",
      ),
    );
  }

  if (Array.isArray(input.processedRequestIds)) {
    const seen = new Set<string>();

    input.processedRequestIds.forEach((id, index) => {
      if (
        typeof id !== "string" ||
        !ID_PATTERN.test(id)
      ) {
        issues.push(
          makeIssue(
            "INVALID_PROCESSED_REQUEST_ID",
            `processedRequestIds[${index}]`,
            "Processed request ID is invalid.",
          ),
        );
        return;
      }

      if (seen.has(id)) {
        issues.push(
          makeIssue(
            "DUPLICATE_PROCESSED_REQUEST_ID",
            `processedRequestIds[${index}]`,
            "Processed request ID list contains a duplicate.",
          ),
        );
        return;
      }

      seen.add(id);
    });
  }

  if (issues.length > 0) {
    return makeResult({
      requestId,
      decision: "REJECTED_INVALID_REQUEST",
      issues,
    });
  }

  if (
    requestId !== null &&
    input.processedRequestIds?.includes(requestId)
  ) {
    return makeResult({
      requestId,
      decision: "REJECTED_DUPLICATE_REQUEST",
      issues: [
        makeIssue(
          "DUPLICATE_REQUEST",
          "requestId",
          "This request ID is already present in the processed request snapshot.",
        ),
      ],
    });
  }

  const profileValidation = validateCreatureProfile(
    input.profile,
  );

  if (!profileValidation.valid) {
    return makeResult({
      requestId,
      decision: "REJECTED_INVALID_REQUEST",
      issues: profileValidation.issues,
    });
  }

  const readiness = validateEvolutionExecutionReadiness(
    input.profile,
    input.species,
    input.branchId,
  );

  if (!readiness.readyForEvaluation) {
    return makeResult({
      requestId,
      decision: "REJECTED_NOT_READY",
      readinessChecked: true,
      issues: readiness.issues,
    });
  }

  const profile = input.profile as CreatureProfile;
  const species = input.species as SpeciesDefinition[];

  const sourceSpecies = species.find(
    (entry) => entry.id === profile.speciesId,
  );

  const branch = sourceSpecies?.evolutionBranches.find(
    (entry) => entry.id === input.branchId,
  );

  if (!branch) {
    return makeResult({
      requestId,
      decision: "REJECTED_NOT_READY",
      readinessChecked: true,
      issues: [
        makeIssue(
          "BRANCH_RESOLUTION_FAILED",
          "branchId",
          "The validated evolution branch could not be resolved.",
        ),
      ],
    });
  }

  const evaluation = evaluateEvolutionRequirements(
    branch.requirements,
    input.evaluationContext as
      | EvolutionRequirementEvaluationContext
      | unknown,
  );

  if (evaluation.inputErrors.length > 0) {
    return makeResult({
      requestId,
      decision: "REJECTED_INVALID_REQUEST",
      readinessChecked: true,
      requirementsEvaluated: false,
      evaluations: evaluation.evaluations,
      issues: evaluation.inputErrors,
    });
  }

  if (!evaluation.requirementsMet) {
    return makeResult({
      requestId,
      decision: "REQUIREMENTS_NOT_MET",
      requirementsMet: false,
      readinessChecked: true,
      requirementsEvaluated: true,
      evaluations: evaluation.evaluations,
    });
  }

  return makeResult({
    requestId,
    decision: "READY_FOR_EXECUTION",
    requirementsMet: true,
    readinessChecked: true,
    requirementsEvaluated: true,
    evaluations: evaluation.evaluations,
  });
}