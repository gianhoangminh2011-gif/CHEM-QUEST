import {
  validateSpeciesDefinition,
  type ContractIssue,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";
import { validateEvolutionGraph } from "./EvolutionGraphValidator";
import {
  validateEvolutionRequirements,
} from "./EvolutionRequirementValidator";

export interface EvolutionDatasetValidationResult {
  valid: boolean;
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
): EvolutionDatasetValidationResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...issues]),
  });
}

/**
 * Validates a complete Creature Realm evolution dataset.
 *
 * Validation order:
 * 1. Validate the input collection.
 * 2. Validate every Species definition.
 * 3. Stop dependent validation if structural validation fails.
 * 4. Validate evolution graph integrity.
 * 5. Validate evolution requirement definitions.
 *
 * This function is validation-only:
 * - It does not mutate the input.
 * - It does not execute evolution requirements.
 * - It does not perform evolution.
 * - It does not persist or register Species.
 */
export function validateEvolutionDataset(
  input: unknown,
): EvolutionDatasetValidationResult {
  if (!Array.isArray(input)) {
    return makeResult([
      makeIssue(
        "INVALID_DATASET",
        "$",
        "Evolution dataset must be an array.",
      ),
    ]);
  }

  const issues: ContractIssue[] = [];

  // Stage 1: Validate every Species structure before invoking
  // validators that rely on the SpeciesDefinition contract.
  input.forEach((entry: unknown, index: number) => {
    const validation = validateSpeciesDefinition(entry);

    validation.issues.forEach((entryIssue) => {
      issues.push(
        makeIssue(
          entryIssue.code,
          `[${index}].${entryIssue.path}`,
          entryIssue.message,
        ),
      );
    });
  });

  // Do not pass malformed runtime data to dependent validators.
  if (issues.length > 0) {
    return makeResult(issues);
  }

  const species = input as SpeciesDefinition[];

  // Stage 2: Validate graph integrity.
  const graphResult = validateEvolutionGraph(species);

  issues.push(...graphResult.issues);

  // Stage 3: Validate requirement definitions.
  const requirementResult =
    validateEvolutionRequirements(species);

  issues.push(...requirementResult.issues);

  return makeResult(issues);
}