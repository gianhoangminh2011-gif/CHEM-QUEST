
import { parseChemicalFormula } from "../elements/FormulaCompound";

export type EducationalReactionStatus =
  | "DRAFT"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "REJECTED";

export interface EducationalReactionSpecies {
  formula: string;
  coefficient: number;
}

export interface EducationalReactionSource {
  title: string;
  publisher: string;
  url: string;
  locator: string;
  accessedAt: string;
}

export interface EducationalReaction {
  id: string;
  name: string;
  reactants: readonly EducationalReactionSpecies[];
  products: readonly EducationalReactionSpecies[];
  classification?: string;
  conditions?: string;
  sources: readonly EducationalReactionSource[];
  status: EducationalReactionStatus;
  approvedBy?: string;
  approvalReference?: string;
}

export type EducationalReactionIssueCode =
  | "INVALID_ENTRY"
  | "INVALID_ID"
  | "DUPLICATE_ID"
  | "INVALID_NAME"
  | "INVALID_STATUS"
  | "INVALID_SPECIES"
  | "INVALID_FORMULA"
  | "INVALID_COEFFICIENT"
  | "DUPLICATE_SPECIES"
  | "ATOM_IMBALANCE"
  | "INVALID_SOURCE"
  | "MISSING_APPROVAL_METADATA";

export interface EducationalReactionIssue {
  code: EducationalReactionIssueCode;
  reactionId?: string;
  message: string;
}

export interface EducationalReactionRegistry {
  reactions: readonly EducationalReaction[];
  issues: readonly EducationalReactionIssue[];
  valid: boolean;
}

const VALID_STATUSES: readonly EducationalReactionStatus[] = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "APPROVED",
  "REJECTED",
];

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function issue(
  code: EducationalReactionIssueCode,
  message: string,
  reactionId?: string,
): EducationalReactionIssue {
  return {
    code,
    message,
    reactionId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSource(
  source: unknown,
  reactionId: string,
): EducationalReactionIssue[] {
  if (!isRecord(source)) {
    return [
      issue(
        "INVALID_SOURCE",
        "Source must be an object.",
        reactionId,
      ),
    ];
  }

  const issues: EducationalReactionIssue[] = [];

  if (!isNonEmptyString(source.title)) {
    issues.push(
      issue("INVALID_SOURCE", "Source title is required.", reactionId),
    );
  }

  if (!isNonEmptyString(source.publisher)) {
    issues.push(
      issue("INVALID_SOURCE", "Source publisher is required.", reactionId),
    );
  }

  if (!isNonEmptyString(source.locator)) {
    issues.push(
      issue("INVALID_SOURCE", "Source locator is required.", reactionId),
    );
  }

  if (!isNonEmptyString(source.url)) {
    issues.push(
      issue("INVALID_SOURCE", "Source URL is required.", reactionId),
    );
  } else {
    try {
      const parsedUrl = new URL(source.url);

      if (parsedUrl.protocol !== "https:") {
        issues.push(
          issue(
            "INVALID_SOURCE",
            "Source URL must use HTTPS.",
            reactionId,
          ),
        );
      }
    } catch {
      issues.push(
        issue("INVALID_SOURCE", "Source URL is invalid.", reactionId),
      );
    }
  }

  if (
    !isNonEmptyString(source.accessedAt) ||
    !DATE_PATTERN.test(source.accessedAt) ||
    Number.isNaN(Date.parse(`${source.accessedAt}T00:00:00Z`))
  ) {
    issues.push(
      issue(
        "INVALID_SOURCE",
        "Source accessedAt must use YYYY-MM-DD format.",
        reactionId,
      ),
    );
  }

  return issues;
}

function validateSpecies(
  species: unknown,
  side: string,
  reactionId: string,
): EducationalReactionIssue[] {
  if (!Array.isArray(species) || species.length === 0) {
    return [
      issue(
        "INVALID_SPECIES",
        `${side} must contain at least one chemical species.`,
        reactionId,
      ),
    ];
  }

  const issues: EducationalReactionIssue[] = [];
  const seenFormulas = new Set<string>();

  for (const entry of species) {
    if (!isRecord(entry)) {
      issues.push(
        issue(
          "INVALID_SPECIES",
          `${side} contains an invalid species entry.`,
          reactionId,
        ),
      );
      continue;
    }

    if (!isNonEmptyString(entry.formula)) {
      issues.push(
        issue(
          "INVALID_FORMULA",
          `${side} contains an empty formula.`,
          reactionId,
        ),
      );
      continue;
    }

    const formula = entry.formula.trim();

    if (seenFormulas.has(formula)) {
      issues.push(
        issue(
          "DUPLICATE_SPECIES",
          `${side} contains duplicate formula ${formula}.`,
          reactionId,
        ),
      );
    }

    seenFormulas.add(formula);

    const parsed = parseChemicalFormula(formula);

    if (!parsed.valid) {
      issues.push(
        issue(
          "INVALID_FORMULA",
          `Invalid formula "${formula}": ${parsed.issues
            .map((item) => item.message)
            .join("; ")}`,
          reactionId,
        ),
      );
    }

    if (
      typeof entry.coefficient !== "number" ||
      !Number.isSafeInteger(entry.coefficient) ||
      entry.coefficient <= 0
    ) {
      issues.push(
        issue(
          "INVALID_COEFFICIENT",
          `Coefficient for ${formula} must be a positive safe integer.`,
          reactionId,
        ),
      );
    }
  }

  return issues;
}

function calculateAtomTotals(
  species: readonly EducationalReactionSpecies[],
): Map<string, number> | undefined {
  const totals = new Map<string, number>();

  for (const entry of species) {
    const parsed = parseChemicalFormula(entry.formula);

    if (
      !parsed.valid ||
      !Number.isSafeInteger(entry.coefficient) ||
      entry.coefficient <= 0
    ) {
      return undefined;
    }

    for (const element of parsed.composition) {
      const next =
        (totals.get(element.symbol) ?? 0) +
        element.count * entry.coefficient;

      if (!Number.isSafeInteger(next)) {
        return undefined;
      }

      totals.set(element.symbol, next);
    }
  }

  return totals;
}

function validateAtomBalance(
  reaction: EducationalReaction,
): EducationalReactionIssue[] {
  const reactantTotals = calculateAtomTotals(reaction.reactants);
  const productTotals = calculateAtomTotals(reaction.products);

  if (!reactantTotals || !productTotals) {
    return [];
  }

  const symbols = new Set([
    ...reactantTotals.keys(),
    ...productTotals.keys(),
  ]);

  const differences: string[] = [];

  for (const symbol of symbols) {
    const reactantCount = reactantTotals.get(symbol) ?? 0;
    const productCount = productTotals.get(symbol) ?? 0;

    if (reactantCount !== productCount) {
      differences.push(
        `${symbol}: reactants=${reactantCount}, products=${productCount}`,
      );
    }
  }

  if (differences.length === 0) {
    return [];
  }

  return [
    issue(
      "ATOM_IMBALANCE",
      `Reaction is not atom-balanced (${differences.join("; ")}).`,
      reaction.id,
    ),
  ];
}

function validateReaction(
  value: unknown,
): EducationalReactionIssue[] {
  if (!isRecord(value)) {
    return [
      issue(
        "INVALID_ENTRY",
        "Reaction entry must be an object.",
      ),
    ];
  }

  const reactionId =
    typeof value.id === "string" ? value.id : undefined;

  const issues: EducationalReactionIssue[] = [];

  if (!isNonEmptyString(value.id) || !ID_PATTERN.test(value.id)) {
    issues.push(
      issue(
        "INVALID_ID",
        "Reaction ID must use lowercase kebab-case.",
        reactionId,
      ),
    );
  }

  if (!isNonEmptyString(value.name)) {
    issues.push(
      issue(
        "INVALID_NAME",
        "Reaction name is required.",
        reactionId,
      ),
    );
  }

  if (
    typeof value.status !== "string" ||
    !VALID_STATUSES.includes(
      value.status as EducationalReactionStatus,
    )
  ) {
    issues.push(
      issue(
        "INVALID_STATUS",
        "Reaction status is invalid.",
        reactionId,
      ),
    );
  }

  issues.push(
    ...validateSpecies(value.reactants, "Reactants", reactionId ?? ""),
    ...validateSpecies(value.products, "Products", reactionId ?? ""),
  );

  if (Array.isArray(value.sources)) {
    if (value.sources.length === 0) {
      issues.push(
        issue(
          "INVALID_SOURCE",
          "At least one source is required.",
          reactionId,
        ),
      );
    }

    for (const source of value.sources) {
      issues.push(...validateSource(source, reactionId ?? ""));
    }
  } else {
    issues.push(
      issue(
        "INVALID_SOURCE",
        "Sources must be an array.",
        reactionId,
      ),
    );
  }

  if (
    value.status === "APPROVED" &&
    (!isNonEmptyString(value.approvedBy) ||
      !isNonEmptyString(value.approvalReference))
  ) {
    issues.push(
      issue(
        "MISSING_APPROVAL_METADATA",
        "Approved reactions require approvedBy and approvalReference.",
        reactionId,
      ),
    );
  }

  if (
    Array.isArray(value.reactants) &&
    Array.isArray(value.products) &&
    value.reactants.length > 0 &&
    value.products.length > 0 &&
    value.reactants.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.formula) &&
        typeof entry.coefficient === "number" &&
        Number.isSafeInteger(entry.coefficient) &&
        entry.coefficient > 0,
    ) &&
    value.products.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.formula) &&
        typeof entry.coefficient === "number" &&
        Number.isSafeInteger(entry.coefficient) &&
        entry.coefficient > 0,
    )
  ) {
    issues.push(
      ...validateAtomBalance(
        value as unknown as EducationalReaction,
      ),
    );
  }

  return issues;
}

function freezeReaction(
  reaction: EducationalReaction,
): EducationalReaction {
  return Object.freeze({
    ...reaction,
    reactants: Object.freeze(
      reaction.reactants.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
    products: Object.freeze(
      reaction.products.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
    sources: Object.freeze(
      reaction.sources.map((source) =>
        Object.freeze({ ...source }),
      ),
    ),
  });
}

export function buildEducationalReactionRegistry(
  entries: readonly EducationalReaction[],
): EducationalReactionRegistry {
  const issues: EducationalReactionIssue[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    const entryIssues = validateReaction(entry);
    issues.push(...entryIssues);

    if (typeof entry?.id === "string") {
      if (seenIds.has(entry.id)) {
        issues.push(
          issue(
            "DUPLICATE_ID",
            `Duplicate reaction ID "${entry.id}".`,
            entry.id,
          ),
        );
      }

      seenIds.add(entry.id);
    }
  }

  const reactions = entries
    .filter(
      (entry) =>
        isRecord(entry) &&
        Array.isArray(entry.reactants) &&
        Array.isArray(entry.products) &&
        Array.isArray(entry.sources),
    )
    .map(freezeReaction);

  const frozenIssues = Object.freeze(
    issues.map((entry) => Object.freeze({ ...entry })),
  );

  return Object.freeze({
    reactions: Object.freeze(reactions),
    issues: frozenIssues,
    valid: frozenIssues.length === 0,
  });
}

export function getApprovedEducationalReactionById(
  registry: EducationalReactionRegistry,
  reactionId: string,
): EducationalReaction | undefined {
  if (!registry.valid) {
    return undefined;
  }

  return registry.reactions.find(
    (reaction) =>
      reaction.id === reactionId &&
      reaction.status === "APPROVED",
  );
}
