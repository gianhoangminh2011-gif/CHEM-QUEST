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

export interface EducationalReactionIssue {
  reactionId?: string;
  code: string;
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

function issue(
  code: string,
  message: string,
  reactionId?: string,
): EducationalReactionIssue {
  return { code, message, reactionId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSpecies(
  species: readonly EducationalReactionSpecies[],
  reactionId: string,
  side: string,
): EducationalReactionIssue[] {
  const issues: EducationalReactionIssue[] = [];
  const seenFormulas = new Set<string>();

  if (!Array.isArray(species) || species.length === 0) {
    return [
      issue(
        "INVALID_SPECIES",
        `${side} must contain at least one species.`,
        reactionId,
      ),
    ];
  }

  for (const item of species) {
    if (!item || typeof item !== "object") {
      issues.push(
        issue("INVALID_SPECIES", `${side} contains an invalid species.`, reactionId),
      );
      continue;
    }

    if (!isNonEmptyString(item.formula)) {
      issues.push(
        issue("INVALID_FORMULA", `${side} contains an empty formula.`, reactionId),
      );
      continue;
    }

    const parsed = parseChemicalFormula(item.formula);

    if (!parsed.valid) {
      issues.push(
        issue(
          "INVALID_FORMULA",
          `Invalid formula "${item.formula}": ${parsed.issues
            .map((entry) => entry.message)
            .join("; ")}`,
          reactionId,
        ),
      );
    }

    if (
      !Number.isSafeInteger(item.coefficient) ||
      item.coefficient <= 0
    ) {
      issues.push(
        issue(
          "INVALID_COEFFICIENT",
          `Coefficient for "${item.formula}" must be a positive safe integer.`,
          reactionId,
        ),
      );
    }

    if (seenFormulas.has(item.formula)) {
      issues.push(
        issue(
          "DUPLICATE_SPECIES",
          `Duplicate formula "${item.formula}" on ${side}.`,
          reactionId,
        ),
      );
    }

    seenFormulas.add(item.formula);
  }

  return issues;
}

function getAtomTotals(
  species: readonly EducationalReactionSpecies[],
): Map<string, number> | undefined {
  const totals = new Map<string, number>();

  for (const item of species) {
    const parsed = parseChemicalFormula(item.formula);

    if (!parsed.valid) {
      return undefined;
    }

    if (
      !Number.isSafeInteger(item.coefficient) ||
      item.coefficient <= 0
    ) {
      return undefined;
    }

    for (const element of parsed.composition) {
      const next =
        (totals.get(element.symbol) ?? 0) +
        element.count * item.coefficient;

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
  const reactantTotals = getAtomTotals(reaction.reactants);
  const productTotals = getAtomTotals(reaction.products);

  if (!reactantTotals || !productTotals) {
    return [];
  }

  const symbols = new Set([
    ...reactantTotals.keys(),
    ...productTotals.keys(),
  ]);

  for (const symbol of symbols) {
    if (
      (reactantTotals.get(symbol) ?? 0) !==
      (productTotals.get(symbol) ?? 0)
    ) {
      return [
        issue(
          "ATOM_IMBALANCE",
          `Atom count for ${symbol} is not balanced.`,
          reaction.id,
        ),
      ];
    }
  }

  return [];
}

function validateSources(
  sources: readonly EducationalReactionSource[],
  reactionId: string,
): EducationalReactionIssue[] {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [
      issue(
        "INVALID_SOURCE",
        "At least one traceable source is required.",
        reactionId,
      ),
    ];
  }

  const issues: EducationalReactionIssue[] = [];

  for (const source of sources) {
    if (
      !source ||
      !isNonEmptyString(source.title) ||
      !isNonEmptyString(source.publisher) ||
      !isNonEmptyString(source.locator) ||
      !isNonEmptyString(source.accessedAt) ||
      !/^https:\/\/\S+$/i.test(source.url)
    ) {
      issues.push(
        issue(
          "INVALID_SOURCE",
          "Each source requires a title, publisher, HTTPS URL, locator, and access date.",
          reactionId,
        ),
      );
      continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt)) {
      issues.push(
        issue(
          "INVALID_SOURCE",
          "Source access date must use YYYY-MM-DD format.",
          reactionId,
        ),
      );
    }
  }

  return issues;
}

function validateReaction(
  reaction: EducationalReaction,
): EducationalReactionIssue[] {
  if (!reaction || typeof reaction !== "object") {
    return [issue("INVALID_ENTRY", "Reaction entry must be an object.")];
  }

  const reactionId =
    typeof reaction.id === "string" ? reaction.id : undefined;

  const issues: EducationalReactionIssue[] = [];

  if (
    !reactionId ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reactionId)
  ) {
    issues.push(
      issue(
        "INVALID_ID",
        "Reaction ID must use lowercase kebab-case.",
        reactionId,
      ),
    );
  }

  if (!isNonEmptyString(reaction.name)) {
    issues.push(
      issue("INVALID_NAME", "Reaction name cannot be empty.", reactionId),
    );
  }

  if (!VALID_STATUSES.includes(reaction.status)) {
    issues.push(
      issue("INVALID_STATUS", "Reaction status is not supported.", reactionId),
    );
  }

  issues.push(
    ...validateSpecies(reaction.reactants, reactionId ?? "", "Reactants"),
  );
  issues.push(
    ...validateSpecies(reaction.products, reactionId ?? "", "Products"),
  );

  issues.push(...validateSources(reaction.sources, reactionId ?? ""));

  issues.push(...validateAtomBalance(reaction));

  if (reaction.status === "APPROVED") {
    if (!isNonEmptyString(reaction.approvedBy)) {
      issues.push(
        issue(
          "MISSING_APPROVAL_METADATA",
          "Approved reactions require an approver.",
          reactionId,
        ),
      );
    }

    if (!isNonEmptyString(reaction.approvalReference)) {
      issues.push(
        issue(
          "MISSING_APPROVAL_METADATA",
          "Approved reactions require an approval reference.",
          reactionId,
        ),
      );
    }
  }

  return issues;
}

export function buildEducationalReactionRegistry(
  entries: readonly EducationalReaction[],
): EducationalReactionRegistry {
  const issues: EducationalReactionIssue[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    const id = entry?.id;

    if (typeof id === "string" && seenIds.has(id)) {
      issues.push(
        issue("DUPLICATE_ID", `Duplicate reaction ID "${id}".`, id),
      );
    }

    if (typeof id === "string") {
      seenIds.add(id);
    }

    issues.push(...validateReaction(entry));
  }

  const frozenReactions = entries.map((entry) =>
    Object.freeze({
      ...entry,
      reactants: Object.freeze(
        entry.reactants.map((item) => Object.freeze({ ...item })),
      ),
      products: Object.freeze(
        entry.products.map((item) => Object.freeze({ ...item })),
      ),
      sources: Object.freeze(
        entry.sources.map((source) => Object.freeze({ ...source })),
      ),
    }),
  );

  const frozenIssues = issues.map((entry) => Object.freeze({ ...entry }));

  return Object.freeze({
    reactions: Object.freeze(frozenReactions),
    issues: Object.freeze(frozenIssues),
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