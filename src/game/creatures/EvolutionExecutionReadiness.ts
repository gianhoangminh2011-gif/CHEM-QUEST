
import {
  validateCreatureProfile,
  type ContractIssue,
  type CreatureProfile,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";
import { validateEvolutionDataset } from "./EvolutionDatasetValidator";

export interface EvolutionExecutionReadinessResult {
  readyForEvaluation: boolean;
  requirementsEvaluated: false;
  evolutionExecuted: false;
  issues: readonly ContractIssue[];
}

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function makeResult(
  issues: ContractIssue[],
): EvolutionExecutionReadinessResult {
  return Object.freeze({
    readyForEvaluation: issues.length === 0,
    requirementsEvaluated: false,
    evolutionExecuted: false,
    issues: Object.freeze([...issues]),
  });
}

/**
 * Performs static readiness checks for a proposed evolution branch.
 *
 * This validator:
 * - Validates the Creature Profile.
 * - Validates the complete Species evolution dataset.
 * - Confirms the source Species is ACTIVE.
 * - Confirms the requested branch exists.
 * - Confirms the target Species is APPROVED or ACTIVE.
 *
 * It does not evaluate gameplay requirements, execute evolution,
 * mutate profiles, or persist data.
 */
export function validateEvolutionExecutionReadiness(
  profileInput: unknown,
  speciesInput: unknown,
  branchId: unknown,
): EvolutionExecutionReadinessResult {
  const issues: ContractIssue[] = [];

  const profileValidation = validateCreatureProfile(profileInput);

  for (const entry of profileValidation.issues) {
    issues.push(
      makeIssue(
        entry.code,
        `profile.${entry.path}`,
        entry.message,
      ),
    );
  }

  const datasetValidation = validateEvolutionDataset(speciesInput);

  for (const entry of datasetValidation.issues) {
    issues.push(
      makeIssue(
        entry.code,
        `speciesDataset.${entry.path}`,
        entry.message,
      ),
    );
  }

  if (typeof branchId !== "string" || branchId.trim().length === 0) {
    issues.push(
      makeIssue(
        "INVALID_BRANCH_ID",
        "branchId",
        "A non-empty evolution branch ID is required.",
      ),
    );
  }

  // Do not inspect dependent fields until the input contracts pass.
  if (
    !profileValidation.valid ||
    !datasetValidation.valid ||
    typeof branchId !== "string" ||
    branchId.trim().length === 0
  ) {
    return makeResult(issues);
  }

  const profile = profileInput as CreatureProfile;
  const species = speciesInput as SpeciesDefinition[];

  const speciesById = new Map(
    species.map((entry) => [entry.id, entry]),
  );

  const sourceSpecies = speciesById.get(profile.speciesId);

  if (!sourceSpecies) {
    issues.push(
      makeIssue(
        "UNKNOWN_SOURCE_SPECIES",
        "profile.speciesId",
        "Creature Profile references a Species outside the dataset.",
      ),
    );

    return makeResult(issues);
  }

  if (sourceSpecies.status !== "ACTIVE") {
    issues.push(
      makeIssue(
        "SOURCE_SPECIES_NOT_ACTIVE",
        "sourceSpecies.status",
        "Source Species must be ACTIVE for evolution evaluation readiness.",
      ),
    );
  }

  const branch = sourceSpecies.evolutionBranches.find(
    (entry) => entry.id === branchId,
  );

  if (!branch) {
    issues.push(
      makeIssue(
        "EVOLUTION_BRANCH_NOT_FOUND",
        "branchId",
        "The selected evolution branch does not belong to the source Species.",
      ),
    );

    return makeResult(issues);
  }

  const targetSpecies = speciesById.get(branch.targetSpeciesId);

  if (!targetSpecies) {
    // Normally caught by dataset validation; retain this defensive check.
    issues.push(
      makeIssue(
        "UNKNOWN_EVOLUTION_TARGET",
        "targetSpeciesId",
        "The selected branch target does not exist.",
      ),
    );

    return makeResult(issues);
  }

  if (
    targetSpecies.status !== "APPROVED" &&
    targetSpecies.status !== "ACTIVE"
  ) {
    issues.push(
      makeIssue(
        "TARGET_SPECIES_NOT_APPROVED",
        "targetSpecies.status",
        "Target Species must be APPROVED or ACTIVE.",
      ),
    );
  }

  return makeResult(issues);
}
