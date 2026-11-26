
import {
  AFFINITY_LEVELS,
  CULTIVATION_REALMS,
  type ContractIssue,
  type SpeciesDefinition,
} from "./CreatureRealmContracts";

export interface EvolutionRequirementValidationResult {
  valid: boolean;
  issues: readonly ContractIssue[];
}

type ParsedRequirement =
  | {
      type: "LEVEL";
      value: number;
      normalized: string;
    }
  | {
      type: "REALM";
      value: string;
      normalized: string;
    }
  | {
      type: "ITEM";
      id: string;
      quantity: number;
      normalized: string;
    }
  | {
      type: "QUEST";
      id: string;
      status: "COMPLETED";
      normalized: string;
    }
  | {
      type: "AFFINITY";
      elementId: string;
      level: string;
      normalized: string;
    };

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function makeResult(
  issues: ContractIssue[],
): EvolutionRequirementValidationResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
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

function isValidId(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(value);
}

function parsePositiveInteger(
  value: string,
): number | undefined {
  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return undefined;
  }

  return parsed;
}

/**
 * Supported requirement formats:
 *
 * LEVEL>=10
 * REALM>=KHAI_VAT_CANH
 * ITEM:ITEM-001>=2
 * QUEST:QUEST-001=COMPLETED
 * AFFINITY:ELEMENT-001>=TUONG_HOP
 *
 * Whitespace around operators is accepted.
 * Requirement evaluation is intentionally out of scope.
 */
function parseRequirement(
  raw: string,
):
  | { valid: true; value: ParsedRequirement }
  | { valid: false; code: string; message: string } {
  const input = raw.trim();

  if (input.length === 0) {
    return {
      valid: false,
      code: "EMPTY_REQUIREMENT",
      message: "Requirement must not be empty.",
    };
  }

  const levelMatch = input.match(
    /^LEVEL\s*>=\s*(\d+)$/,
  );

  if (levelMatch) {
    const value = parsePositiveInteger(levelMatch[1]);

    if (value === undefined) {
      return {
        valid: false,
        code: "INVALID_REQUIREMENT_VALUE",
        message: "LEVEL must be a positive safe integer.",
      };
    }

    return {
      valid: true,
      value: {
        type: "LEVEL",
        value,
        normalized: `LEVEL>=${value}`,
      },
    };
  }

  const realmMatch = input.match(
    /^REALM\s*>=\s*([A-Z][A-Z0-9_]*)$/,
  );

  if (realmMatch) {
    const realm = realmMatch[1];

    if (
      !(CULTIVATION_REALMS as readonly string[]).includes(realm)
    ) {
      return {
        valid: false,
        code: "INVALID_REQUIREMENT_VALUE",
        message: `Unknown cultivation realm: ${realm}.`,
      };
    }

    return {
      valid: true,
      value: {
        type: "REALM",
        value: realm,
        normalized: `REALM>=${realm}`,
      },
    };
  }

  const itemMatch = input.match(
    /^ITEM:([A-Z0-9][A-Z0-9_-]{2,63})\s*>=\s*(\d+)$/,
  );

  if (itemMatch) {
    const quantity = parsePositiveInteger(itemMatch[2]);

    if (quantity === undefined) {
      return {
        valid: false,
        code: "INVALID_REQUIREMENT_VALUE",
        message: "ITEM quantity must be a positive safe integer.",
      };
    }

    return {
      valid: true,
      value: {
        type: "ITEM",
        id: itemMatch[1],
        quantity,
        normalized: `ITEM:${itemMatch[1]}>=${quantity}`,
      },
    };
  }

  const questMatch = input.match(
    /^QUEST:([A-Z0-9][A-Z0-9_-]{2,63})\s*=\s*([A-Z]+)$/,
  );

  if (questMatch) {
    if (questMatch[2] !== "COMPLETED") {
      return {
        valid: false,
        code: "INVALID_REQUIREMENT_VALUE",
        message: "QUEST status must be COMPLETED.",
      };
    }

    return {
      valid: true,
      value: {
        type: "QUEST",
        id: questMatch[1],
        status: "COMPLETED",
        normalized: `QUEST:${questMatch[1]}=COMPLETED`,
      },
    };
  }

  const affinityMatch = input.match(
    /^AFFINITY:([A-Z0-9][A-Z0-9_-]{2,63})\s*>=\s*([A-Z_]+)$/,
  );

  if (affinityMatch) {
    const affinityLevel = affinityMatch[2];

    if (
      !(AFFINITY_LEVELS as readonly string[]).includes(
        affinityLevel,
      )
    ) {
      return {
        valid: false,
        code: "INVALID_REQUIREMENT_VALUE",
        message: `Unknown affinity level: ${affinityLevel}.`,
      };
    }

    return {
      valid: true,
      value: {
        type: "AFFINITY",
        elementId: affinityMatch[1],
        level: affinityLevel,
        normalized: `AFFINITY:${affinityMatch[1]}>=${affinityLevel}`,
      },
    };
  }

  const prefix = input.match(/^([A-Z]+)(?::|>=|=)/);

  const knownTypes = [
    "LEVEL",
    "REALM",
    "ITEM",
    "QUEST",
    "AFFINITY",
  ];

  if (prefix && !knownTypes.includes(prefix[1])) {
    return {
      valid: false,
      code: "UNKNOWN_REQUIREMENT_TYPE",
      message: `Unsupported requirement type: ${prefix[1]}.`,
    };
  }

  return {
    valid: false,
    code: "MALFORMED_REQUIREMENT",
    message: "Requirement does not match a supported format.",
  };
}

/**
 * Validates evolution requirements for every Species branch.
 *
 * This function:
 * - Validates requirement syntax and values.
 * - Detects duplicate requirements within a branch.
 * - Reports precise source paths.
 * - Does not mutate Species or execute evolution logic.
 */
export function validateEvolutionRequirements(
  species: readonly SpeciesDefinition[],
): EvolutionRequirementValidationResult {
  const issues: ContractIssue[] = [];

  if (!Array.isArray(species)) {
    return makeResult([
      makeIssue(
        "INVALID_SPECIES_COLLECTION",
        "$",
        "Species collection must be an array.",
      ),
    ]);
  }

  species.forEach((entry, speciesIndex) => {
    const speciesPath = `[${speciesIndex}]`;

    if (!isRecord(entry)) {
      issues.push(
        makeIssue(
          "INVALID_SPECIES_ENTRY",
          speciesPath,
          "Species entry must be an object.",
        ),
      );
      return;
    }

    if (!Array.isArray(entry.evolutionBranches)) {
      issues.push(
        makeIssue(
          "INVALID_EVOLUTION_BRANCHES",
          `${speciesPath}.evolutionBranches`,
          "Evolution branches must be an array.",
        ),
      );
      return;
    }

    entry.evolutionBranches.forEach(
      (branch, branchIndex) => {
        const branchPath =
          `${speciesPath}.evolutionBranches[${branchIndex}]`;

        if (!isRecord(branch)) {
          issues.push(
            makeIssue(
              "INVALID_EVOLUTION_BRANCH",
              branchPath,
              "Evolution branch must be an object.",
            ),
          );
          return;
        }

        if (!Array.isArray(branch.requirements)) {
          issues.push(
            makeIssue(
              "INVALID_REQUIREMENTS_ARRAY",
              `${branchPath}.requirements`,
              "Requirements must be an array.",
            ),
          );
          return;
        }

        const seen = new Set<string>();

        branch.requirements.forEach(
          (requirement, requirementIndex) => {
            const path =
              `${branchPath}.requirements[${requirementIndex}]`;

            if (typeof requirement !== "string") {
              issues.push(
                makeIssue(
                  "INVALID_REQUIREMENT_TYPE",
                  path,
                  "Requirement must be a string.",
                ),
              );
              return;
            }

            const parsed = parseRequirement(requirement);

            if (!parsed.valid) {
              issues.push(
                makeIssue(
                  parsed.code,
                  path,
                  parsed.message,
                ),
              );
              return;
            }

            const normalized = parsed.value.normalized;

            if (seen.has(normalized)) {
              issues.push(
                makeIssue(
                  "DUPLICATE_REQUIREMENT",
                  path,
                  `Duplicate requirement: ${normalized}.`,
                ),
              );
              return;
            }

            seen.add(normalized);
          },
        );
      },
    );
  });

  return makeResult(issues);
}
