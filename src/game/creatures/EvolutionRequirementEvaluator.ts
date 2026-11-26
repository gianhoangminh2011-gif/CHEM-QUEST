
import {
  AFFINITY_LEVELS,
  CULTIVATION_REALMS,
  type ContractIssue,
} from "./CreatureRealmContracts";

export interface EvolutionInventoryEntry {
  itemId: string;
  quantity: number;
}

export interface EvolutionAffinityEntry {
  elementId: string;
  level: (typeof AFFINITY_LEVELS)[number];
}

/**
 * Runtime state required to evaluate evolution requirements.
 *
 * This is deliberately separate from CreatureProfile because the
 * current CreatureProfile contract does not contain level, inventory,
 * or quest progress.
 */
export interface EvolutionRequirementEvaluationContext {
  level: number;
  cultivationRealm: (typeof CULTIVATION_REALMS)[number];
  inventory: readonly EvolutionInventoryEntry[];
  completedQuestIds: readonly string[];
  affinities: readonly EvolutionAffinityEntry[];
}

export type EvolutionRequirementType =
  | "LEVEL"
  | "REALM"
  | "ITEM"
  | "QUEST"
  | "AFFINITY";

export interface EvolutionRequirementEvaluation {
  requirement: string;
  normalized: string;
  type: EvolutionRequirementType;
  met: boolean;
}

export interface EvolutionRequirementEvaluationResult {
  requirementsMet: boolean;
  evaluations: readonly EvolutionRequirementEvaluation[];
  inputErrors: readonly ContractIssue[];
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
      normalized: string;
    }
  | {
      type: "AFFINITY";
      elementId: string;
      level: string;
      normalized: string;
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function makeResult(
  evaluations: EvolutionRequirementEvaluation[],
  inputErrors: ContractIssue[],
): EvolutionRequirementEvaluationResult {
  return Object.freeze({
    requirementsMet:
      inputErrors.length === 0 &&
      evaluations.length > 0 &&
      evaluations.every((entry) => entry.met),
    evaluations: Object.freeze(
      evaluations.map((entry) => Object.freeze({ ...entry })),
    ),
    inputErrors: Object.freeze([...inputErrors]),
  });
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

  const levelMatch = input.match(/^LEVEL\s*>=\s*(\d+)$/);

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
    /^QUEST:([A-Z0-9][A-Z0-9_-]{2,63})\s*=\s*([A-Z_]+)$/,
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
        normalized:
          `AFFINITY:${affinityMatch[1]}>=${affinityLevel}`,
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

function validateContext(
  input: unknown,
): {
  valid: boolean;
  context?: EvolutionRequirementEvaluationContext;
  issues: ContractIssue[];
} {
  const issues: ContractIssue[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [
        makeIssue(
          "INVALID_CONTEXT",
          "context",
          "Evaluation context must be an object.",
        ),
      ],
    };
  }

  if (
    typeof input.level !== "number" ||
    !Number.isSafeInteger(input.level) ||
    input.level < 1
  ) {
    issues.push(
      makeIssue(
        "INVALID_LEVEL",
        "context.level",
        "Level must be a positive safe integer.",
      ),
    );
  }

  if (
    typeof input.cultivationRealm !== "string" ||
    !(CULTIVATION_REALMS as readonly string[]).includes(
      input.cultivationRealm,
    )
  ) {
    issues.push(
      makeIssue(
        "INVALID_REALM",
        "context.cultivationRealm",
        "Cultivation realm is not recognized.",
      ),
    );
  }

  const inventoryById = new Map<string, number>();

  if (!Array.isArray(input.inventory)) {
    issues.push(
      makeIssue(
        "INVALID_INVENTORY",
        "context.inventory",
        "Inventory must be an array.",
      ),
    );
  } else {
    input.inventory.forEach((entry: unknown, index: number) => {
      const path = `context.inventory[${index}]`;

      if (!isRecord(entry)) {
        issues.push(
          makeIssue(
            "INVALID_INVENTORY_ENTRY",
            path,
            "Inventory entry must be an object.",
          ),
        );
        return;
      }

      if (
        typeof entry.itemId !== "string" ||
        !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(entry.itemId)
      ) {
        issues.push(
          makeIssue(
            "INVALID_ITEM_ID",
            `${path}.itemId`,
            "Item ID format is invalid.",
          ),
        );
        return;
      }

      if (
        typeof entry.quantity !== "number" ||
        !Number.isSafeInteger(entry.quantity) ||
        entry.quantity < 0
      ) {
        issues.push(
          makeIssue(
            "INVALID_ITEM_QUANTITY",
            `${path}.quantity`,
            "Item quantity must be a non-negative safe integer.",
          ),
        );
        return;
      }

      if (inventoryById.has(entry.itemId)) {
        issues.push(
          makeIssue(
            "DUPLICATE_INVENTORY_ITEM",
            `${path}.itemId`,
            `Duplicate inventory item: ${entry.itemId}.`,
          ),
        );
        return;
      }

      inventoryById.set(entry.itemId, entry.quantity);
    });
  }

  const completedQuestIds = new Set<string>();

  if (!Array.isArray(input.completedQuestIds)) {
    issues.push(
      makeIssue(
        "INVALID_COMPLETED_QUESTS",
        "context.completedQuestIds",
        "Completed quest IDs must be an array.",
      ),
    );
  } else {
    input.completedQuestIds.forEach(
      (questId: unknown, index: number) => {
        const path = `context.completedQuestIds[${index}]`;

        if (
          typeof questId !== "string" ||
          !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(questId)
        ) {
          issues.push(
            makeIssue(
              "INVALID_QUEST_ID",
              path,
              "Quest ID format is invalid.",
            ),
          );
          return;
        }

        if (completedQuestIds.has(questId)) {
          issues.push(
            makeIssue(
              "DUPLICATE_COMPLETED_QUEST",
              path,
              `Duplicate completed quest: ${questId}.`,
            ),
          );
          return;
        }

        completedQuestIds.add(questId);
      },
    );
  }

  const affinityByElement = new Map<string, string>();

  if (!Array.isArray(input.affinities)) {
    issues.push(
      makeIssue(
        "INVALID_AFFINITIES",
        "context.affinities",
        "Affinities must be an array.",
      ),
    );
  } else {
    input.affinities.forEach((entry: unknown, index: number) => {
      const path = `context.affinities[${index}]`;

      if (!isRecord(entry)) {
        issues.push(
          makeIssue(
            "INVALID_AFFINITY_ENTRY",
            path,
            "Affinity entry must be an object.",
          ),
        );
        return;
      }

      if (
        typeof entry.elementId !== "string" ||
        !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(entry.elementId)
      ) {
        issues.push(
          makeIssue(
            "INVALID_ELEMENT_ID",
            `${path}.elementId`,
            "Element ID format is invalid.",
          ),
        );
        return;
      }

      if (
        typeof entry.level !== "string" ||
        !(AFFINITY_LEVELS as readonly string[]).includes(entry.level)
      ) {
        issues.push(
          makeIssue(
            "INVALID_AFFINITY_LEVEL",
            `${path}.level`,
            "Affinity level is not recognized.",
          ),
        );
        return;
      }

      if (affinityByElement.has(entry.elementId)) {
        issues.push(
          makeIssue(
            "DUPLICATE_AFFINITY",
            `${path}.elementId`,
            `Duplicate affinity element: ${entry.elementId}.`,
          ),
        );
        return;
      }

      affinityByElement.set(entry.elementId, entry.level);
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    context: input as unknown as EvolutionRequirementEvaluationContext,
    issues,
  };
}

/**
 * Evaluates the five supported evolution requirement types.
 *
 * This function is read-only:
 * - It does not mutate the evaluation context.
 * - It does not consume inventory.
 * - It does not update quests or Creature Profiles.
 * - It does not unlock Species or execute evolution.
 */
export function evaluateEvolutionRequirements(
  requirements: readonly string[],
  contextInput: unknown,
): EvolutionRequirementEvaluationResult {
  const inputErrors: ContractIssue[] = [];

  if (!Array.isArray(requirements)) {
    return makeResult(
      [],
      [
        makeIssue(
          "INVALID_REQUIREMENTS",
          "requirements",
          "Requirements must be an array.",
        ),
      ],
    );
  }

  const contextResult = validateContext(contextInput);

  inputErrors.push(...contextResult.issues);

  if (!contextResult.valid || !contextResult.context) {
    return makeResult([], inputErrors);
  }

  if (requirements.length === 0) {
    inputErrors.push(
      makeIssue(
        "EMPTY_REQUIREMENTS",
        "requirements",
        "At least one requirement is required for evaluation.",
      ),
    );
    return makeResult([], inputErrors);
  }

  const context = contextResult.context;
  const realmIndex = CULTIVATION_REALMS.indexOf(
    context.cultivationRealm,
  );

  const inventory = new Map(
    context.inventory.map((entry) => [
      entry.itemId,
      entry.quantity,
    ]),
  );

  const completedQuests = new Set(context.completedQuestIds);

  const affinities = new Map(
    context.affinities.map((entry) => [
      entry.elementId,
      entry.level,
    ]),
  );

  const evaluations: EvolutionRequirementEvaluation[] = [];
  const seen = new Set<string>();

  requirements.forEach((rawRequirement, index) => {
    const path = `requirements[${index}]`;

    if (typeof rawRequirement !== "string") {
      inputErrors.push(
        makeIssue(
          "INVALID_REQUIREMENT_TYPE",
          path,
          "Requirement must be a string.",
        ),
      );
      return;
    }

    const parsed = parseRequirement(rawRequirement);

    if (!parsed.valid) {
      inputErrors.push(
        makeIssue(
          parsed.code,
          path,
          parsed.message,
        ),
      );
      return;
    }

    const requirement = parsed.value;

    if (seen.has(requirement.normalized)) {
      inputErrors.push(
        makeIssue(
          "DUPLICATE_REQUIREMENT",
          path,
          `Duplicate requirement: ${requirement.normalized}.`,
        ),
      );
      return;
    }

    seen.add(requirement.normalized);

    let met = false;

    switch (requirement.type) {
      case "LEVEL":
        met = context.level >= requirement.value;
        break;

      case "REALM": {
        const requiredRealmIndex = CULTIVATION_REALMS.indexOf(
          requirement.value as (typeof CULTIVATION_REALMS)[number],
        );
        met = realmIndex >= requiredRealmIndex;
        break;
      }

      case "ITEM":
        met =
          (inventory.get(requirement.id) ?? 0) >=
          requirement.quantity;
        break;

      case "QUEST":
        met = completedQuests.has(requirement.id);
        break;

      case "AFFINITY": {
        const currentLevel = affinities.get(requirement.elementId);

        if (currentLevel !== undefined) {
          const currentIndex = AFFINITY_LEVELS.indexOf(
            currentLevel as (typeof AFFINITY_LEVELS)[number],
          );
          const requiredIndex = AFFINITY_LEVELS.indexOf(
            requirement.level as (typeof AFFINITY_LEVELS)[number],
          );

          met = currentIndex >= requiredIndex;
        }
        break;
      }
    }

    evaluations.push({
      requirement: rawRequirement,
      normalized: requirement.normalized,
      type: requirement.type,
      met,
    });
  });

  return makeResult(evaluations, inputErrors);
}
