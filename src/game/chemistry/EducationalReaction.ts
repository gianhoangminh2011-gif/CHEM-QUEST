import { parseChemicalFormula } from "../elements/FormulaCompound";

export type EducationalReactionStatus =
  | "DRAFT"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "REJECTED";

export type EducationalReactionClaim =
  | "REACTANTS_PRODUCTS"
  | "STOICHIOMETRY"
  | "CONDITIONS"
  | "CLASSIFICATION"
  | "CHARGE";

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
  supports: readonly EducationalReactionClaim[];
  author?: string;
  publicationDate?: string;
  identifier?: string;
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

const VALID_CLAIMS: readonly EducationalReactionClaim[] = [
  "REACTANTS_PRODUCTS",
  "STOICHIOMETRY",
  "CONDITIONS",
  "CLASSIFICATION",
  "CHARGE",
];

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function createIssue(
  code: EducationalReactionIssueCode,
  message: string,
  reactionId?: string,
): EducationalReactionIssue {
  return { code, message, reactionId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !DATE_PATTERN.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateSource(
  value: unknown,
  reactionId: string,
): EducationalReactionIssue[] {
  if (!isRecord(value)) {
    return [
      createIssue(
        "INVALID_SOURCE",
        "Source must be an object.",
        reactionId,
      ),
    ];
  }

  const issues: EducationalReactionIssue[] = [];

  if (!isNonEmptyString(value.title)) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "Source title is required.",
        reactionId,
      ),
    );
  }

  if (!isNonEmptyString(value.publisher)) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "Source publisher is required.",
        reactionId,
      ),
    );
  }

  if (!isNonEmptyString(value.locator)) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "Source must identify a specific section, page, table, or record.",
        reactionId,
      ),
    );
  }

  if (!isNonEmptyString(value.url)) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "A stable source URL is required.",
        reactionId,
      ),
    );
  } else {
    try {
      const url = new URL(value.url);

      if (url.protocol !== "https:") {
        issues.push(
          createIssue(
            "INVALID_SOURCE",
            "Source URL must use HTTPS.",
            reactionId,
          ),
        );
      }
    } catch {
      issues.push(
        createIssue(
          "INVALID_SOURCE",
          "Source URL is invalid.",
          reactionId,
        ),
      );
    }
  }

  if (!isValidDate(value.accessedAt)) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "accessedAt must be a valid YYYY-MM-DD date.",
        reactionId,
      ),
    );
  }

  if (
    !Array.isArray(value.supports) ||
    value.supports.length === 0 ||
    !value.supports.every(
      (claim) =>
        typeof claim === "string" &&
        VALID_CLAIMS.includes(
          claim as EducationalReactionClaim,
        ),
    )
  ) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "Source must identify the claims it supports.",
        reactionId,
      ),
    );
  }

  if (
    value.author !== undefined &&
    !isNonEmptyString(value.author)
  ) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "Optional source author must be non-empty.",
        reactionId,
      ),
    );
  }

  if (
    value.publicationDate !== undefined &&
    !isValidDate(value.publicationDate)
  ) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "publicationDate must use YYYY-MM-DD format.",
        reactionId,
      ),
    );
  }

  if (
    value.identifier !== undefined &&
    !isNonEmptyString(value.identifier)
  ) {
    issues.push(
      createIssue(
        "INVALID_SOURCE",
        "Optional source identifier must be non-empty.",
        reactionId,
      ),
    );
  }

  return issues;
}

function validateSpecies(
  value: unknown,
  side: string,
  reactionId: string,
): EducationalReactionIssue[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      createIssue(
        "INVALID_SPECIES",
        `${side} must contain at least one species.`,
        reactionId,
      ),
    ];
  }

  const issues: EducationalReactionIssue[] = [];
  const seenFormulas = new Set<string>();

  for (const entry of value) {
    if (!isRecord(entry)) {
      issues.push(
        createIssue(
          "INVALID_SPECIES",
          `${side} contains an invalid species entry.`,
          reactionId,
        ),
      );
      continue;
    }

    if (!isNonEmptyString(entry.formula)) {
      issues.push(
        createIssue(
          "INVALID_FORMULA",
          `${side} contains an empty formula.`,
          reactionId,
        ),
      );
      continue;
    }

    const parsed = parseChemicalFormula(entry.formula);
    const formula = parsed.formula;

    if (!parsed.valid) {
      issues.push(
        createIssue(
          "INVALID_FORMULA",
          `Invalid formula "${formula}": ${parsed.issues
            .map((item) => item.message)
            .join("; ")}`,
          reactionId,
        ),
      );
    }

    if (seenFormulas.has(formula)) {
      issues.push(
        createIssue(
          "DUPLICATE_SPECIES",
          `${side} contains duplicate formula "${formula}".`,
          reactionId,
        ),
      );
    }

    seenFormulas.add(formula);

    if (
      typeof entry.coefficient !== "number" ||
      !Number.isSafeInteger(entry.coefficient) ||
      entry.coefficient <= 0
    ) {
      issues.push(
        createIssue(
          "INVALID_COEFFICIENT",
          `Coefficient for "${formula}" must be a positive safe integer.`,
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
      const contribution = element.count * entry.coefficient;

      if (!Number.isSafeInteger(contribution)) {
        return undefined;
      }

      const next =
        (totals.get(element.symbol) ?? 0) +
        contribution;

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
  const reactantTotals = calculateAtomTotals(
    reaction.reactants,
  );

  const productTotals = calculateAtomTotals(
    reaction.products,
  );

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
    createIssue(
      "ATOM_IMBALANCE",
      `Reaction is not atom-balanced (${differences.join("; ")}).`,
      reaction.id,
    ),
  ];
}

function validateClaimEvidence(
  reaction: Record<string, unknown>,
  reactionId: string,
): EducationalReactionIssue[] {
  if (!Array.isArray(reaction.sources)) {
    return [];
  }

  const supportedClaims = new Set<string>();

  for (const source of reaction.sources) {
    if (isRecord(source) && Array.isArray(source.supports)) {
      for (const claim of source.supports) {
        if (typeof claim === "string") {
          supportedClaims.add(claim);
        }
      }
    }
  }

  const requiredClaims: EducationalReactionClaim[] = [
    "REACTANTS_PRODUCTS",
    "STOICHIOMETRY",
  ];

  if (reaction.classification !== undefined) {
    requiredClaims.push("CLASSIFICATION");
  }

  if (reaction.conditions !== undefined) {
    requiredClaims.push("CONDITIONS");
  }

  const missing = requiredClaims.filter(
    (claim) => !supportedClaims.has(claim),
  );

  if (missing.length === 0) {
    return [];
  }

  return [
    createIssue(
      "INVALID_SOURCE",
      `No source evidence recorded for: ${missing.join(", ")}.`,
      reactionId,
    ),
  ];
}

function validateReaction(
  value: unknown,
): EducationalReactionIssue[] {
  if (!isRecord(value)) {
    return [
      createIssue(
        "INVALID_ENTRY",
        "Reaction entry must be an object.",
      ),
    ];
  }

  const reactionId =
    typeof value.id === "string" ? value.id : undefined;

  const issues: EducationalReactionIssue[] = [];

  if (
    !isNonEmptyString(value.id) ||
    !ID_PATTERN.test(value.id)
  ) {
    issues.push(
      createIssue(
        "INVALID_ID",
        "Reaction ID must use lowercase kebab-case.",
        reactionId,
      ),
    );
  }

  if (!isNonEmptyString(value.name)) {
    issues.push(
      createIssue(
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
      createIssue(
        "INVALID_STATUS",
        "Reaction status is invalid.",
        reactionId,
      ),
    );
  }

  if (
    value.classification !== undefined &&
    !isNonEmptyString(value.classification)
  ) {
    issues.push(
      createIssue(
        "INVALID_ENTRY",
        "Classification must be non-empty when provided.",
        reactionId,
      ),
    );
  }

  if (
    value.conditions !== undefined &&
    !isNonEmptyString(value.conditions)
  ) {
    issues.push(
      createIssue(
        "INVALID_ENTRY",
        "Conditions must be non-empty when provided.",
        reactionId,
      ),
    );
  }

  const reactantIssues = validateSpecies(
    value.reactants,
    "Reactants",
    reactionId ?? "",
  );

  const productIssues = validateSpecies(
    value.products,
    "Products",
    reactionId ?? "",
  );

  issues.push(...reactantIssues, ...productIssues);

  if (Array.isArray(value.sources)) {
    if (value.sources.length === 0) {
      issues.push(
        createIssue(
          "INVALID_SOURCE",
          "At least one source is required.",
          reactionId,
        ),
      );
    }

    for (const source of value.sources) {
      issues.push(
        ...validateSource(source, reactionId ?? ""),
      );
    }

    issues.push(
      ...validateClaimEvidence(value, reactionId ?? ""),
    );
  } else {
    issues.push(
      createIssue(
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
      createIssue(
        "MISSING_APPROVAL_METADATA",
        "Approved reactions require approvedBy and approvalReference.",
        reactionId,
      ),
    );
  }

  const canCheckBalance =
    Array.isArray(value.reactants) &&
    Array.isArray(value.products) &&
    value.reactants.length > 0 &&
    value.products.length > 0;

  if (canCheckBalance) {
    const structurallyValidSpecies = (
      species: unknown[],
    ): boolean =>
      species.every(
        (entry) =>
          isRecord(entry) &&
          isNonEmptyString(entry.formula) &&
          parseChemicalFormula(entry.formula).valid &&
          typeof entry.coefficient === "number" &&
          Number.isSafeInteger(entry.coefficient) &&
          entry.coefficient > 0,
      );

    if (
      structurallyValidSpecies(value.reactants) &&
      structurallyValidSpecies(value.products)
    ) {
      issues.push(
        ...validateAtomBalance(
          value as unknown as EducationalReaction,
        ),
      );
    }
  }

  return issues;
}

function freezeReaction(
  reaction: EducationalReaction,
): EducationalReaction {
  const freezeSpecies = (
    species: readonly EducationalReactionSpecies[],
  ) =>
    Object.freeze(
      species.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    );

  const sources = Object.freeze(
    reaction.sources.map((source) =>
      Object.freeze({
        ...source,
        supports: Object.freeze([...source.supports]),
      }),
    ),
  );

  return Object.freeze({
    ...reaction,
    reactants: freezeSpecies(reaction.reactants),
    products: freezeSpecies(reaction.products),
    sources,
  });
}

export function buildEducationalReactionRegistry(
  entries: readonly EducationalReaction[],
): EducationalReactionRegistry {
  const issues: EducationalReactionIssue[] = [];
  const seenIds = new Set<string>();

  if (!Array.isArray(entries)) {
    const invalidIssue = Object.freeze([
      createIssue(
        "INVALID_ENTRY",
        "Registry entries must be an array.",
      ),
    ]);

    return Object.freeze({
      reactions: Object.freeze([]),
      issues: invalidIssue,
      valid: false,
    });
  }

  for (const entry of entries) {
    issues.push(...validateReaction(entry));

    if (isRecord(entry) && typeof entry.id === "string") {
      if (seenIds.has(entry.id)) {
        issues.push(
          createIssue(
            "DUPLICATE_ID",
            `Duplicate reaction ID "${entry.id}".`,
            entry.id,
          ),
        );
      }

      seenIds.add(entry.id);
    }
  }

  const frozenIssues = Object.freeze(
    issues.map((entry) =>
      Object.freeze({ ...entry }),
    ),
  );

  const valid = frozenIssues.length === 0;

  // Only expose reactions when the entire registry passes validation.
  // This prevents malformed or partially valid entries from reaching consumers.
  const reactions = valid
    ? entries
        .filter(
          (entry) =>
            isRecord(entry) &&
            Array.isArray(entry.reactants) &&
            Array.isArray(entry.products) &&
            Array.isArray(entry.sources),
        )
        .map((entry) =>
          freezeReaction(entry as EducationalReaction),
        )
    : [];

  return Object.freeze({
    reactions: Object.freeze(reactions),
    issues: frozenIssues,
    valid,
  });
}

export function getApprovedEducationalReactionById(
  registry: EducationalReactionRegistry,
  reactionId: string,
): EducationalReaction | undefined {
  if (
    !registry ||
    !registry.valid ||
    !Array.isArray(registry.reactions) ||
    typeof reactionId !== "string"
  ) {
    return undefined;
  }

  return registry.reactions.find(
    (reaction) =>
      reaction.id === reactionId &&
      reaction.status === "APPROVED",
  );
}