
import { PERIODIC_TABLE_DATA } from "./PeriodicTableData";

export type FormulaIssueCode =
  | "EMPTY_FORMULA"
  | "FORMULA_TOO_LONG"
  | "NESTING_TOO_DEEP"
  | "INVALID_TOKEN"
  | "UNKNOWN_ELEMENT"
  | "INVALID_SUBSCRIPT"
  | "UNMATCHED_PARENTHESES"
  | "EMPTY_GROUP"
  | "UNSAFE_COUNT";

export interface FormulaIssue {
  code: FormulaIssueCode;
  message: string;
  position?: number;
}

export interface ElementComposition {
  symbol: string;
  atomicNumber: number;
  count: number;
}

export interface FormulaParseResult {
  valid: boolean;
  formula: string;
  composition: readonly ElementComposition[];
  issues: readonly FormulaIssue[];
}

interface FormulaParserState {
  position: number;
}

const MAX_FORMULA_LENGTH = 256;
const MAX_NESTING_DEPTH = 32;

const ELEMENTS_BY_SYMBOL = new Map(
  PERIODIC_TABLE_DATA.map((element) => [
    element.symbol,
    element,
  ]),
);

function createIssue(
  code: FormulaIssueCode,
  message: string,
  position?: number,
): FormulaIssue {
  return Object.freeze({ code, message, position });
}

function createParseResult(
  formula: string,
  composition: ElementComposition[],
  issues: FormulaIssue[],
): FormulaParseResult {
  const frozenComposition = Object.freeze(
    composition.map((element) => Object.freeze({ ...element })),
  );

  const frozenIssues = Object.freeze(
    issues.map((issue) => Object.freeze({ ...issue })),
  );

  return Object.freeze({
    valid: frozenIssues.length === 0 && frozenComposition.length > 0,
    formula,
    composition: frozenComposition,
    issues: frozenIssues,
  });
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && character >= "0" && character <= "9";
}

function isUppercase(character: string | undefined): boolean {
  return character !== undefined && character >= "A" && character <= "Z";
}

function isLowercase(character: string | undefined): boolean {
  return character !== undefined && character >= "a" && character <= "z";
}

function getMaximumNestingDepth(formula: string): number {
  let currentDepth = 0;
  let maximumDepth = 0;

  for (const character of formula) {
    if (character === "(") {
      currentDepth += 1;
      maximumDepth = Math.max(maximumDepth, currentDepth);
    } else if (character === ")") {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maximumDepth;
}

function addCounts(
  target: Map<string, number>,
  source: Map<string, number>,
  multiplier: number,
): boolean {
  for (const [symbol, count] of source) {
    const nextCount =
      (target.get(symbol) ?? 0) + count * multiplier;

    if (!Number.isSafeInteger(nextCount) || nextCount <= 0) {
      return false;
    }

    target.set(symbol, nextCount);
  }

  return true;
}

function parseNumber(
  formula: string,
  state: FormulaParserState,
): number {
  const start = state.position;

  while (isDigit(formula[state.position])) {
    state.position += 1;
  }

  if (start === state.position) {
    return 1;
  }

  const value = Number(formula.slice(start, state.position));

  if (!Number.isSafeInteger(value) || value <= 0) {
    return 0;
  }

  return value;
}

function parseGroup(
  formula: string,
  state: FormulaParserState,
  issues: FormulaIssue[],
): Map<string, number> {
  const composition = new Map<string, number>();
  let hasContent = false;

  while (state.position < formula.length) {
    const character = formula[state.position];

    if (character === ")") {
      break;
    }

    if (character === "(") {
      const groupStart = state.position;
      state.position += 1;

      const nestedComposition = parseGroup(
        formula,
        state,
        issues,
      );

      if (formula[state.position] !== ")") {
        issues.push(
          createIssue(
            "UNMATCHED_PARENTHESES",
            "Missing closing parenthesis.",
            groupStart,
          ),
        );
        return composition;
      }

      state.position += 1;

      if (nestedComposition.size === 0) {
        issues.push(
          createIssue(
            "EMPTY_GROUP",
            "Formula groups cannot be empty.",
            groupStart,
          ),
        );
        return composition;
      }

      const multiplier = parseNumber(formula, state);

      if (multiplier === 0) {
        issues.push(
          createIssue(
            "INVALID_SUBSCRIPT",
            "Subscripts must be positive integers.",
            state.position,
          ),
        );
        return composition;
      }

      if (!addCounts(composition, nestedComposition, multiplier)) {
        issues.push(
          createIssue(
            "UNSAFE_COUNT",
            "Element count exceeds the safe integer range.",
            groupStart,
          ),
        );
        return composition;
      }

      hasContent = true;
      continue;
    }

    if (!isUppercase(character)) {
      issues.push(
        createIssue(
          "INVALID_TOKEN",
          `Unexpected character "${character}".`,
          state.position,
        ),
      );
      return composition;
    }

    const elementStart = state.position;
    let symbol = character;

    state.position += 1;

    if (isLowercase(formula[state.position])) {
      symbol += formula[state.position];
      state.position += 1;
    }

    const element = ELEMENTS_BY_SYMBOL.get(symbol);

    if (!element) {
      issues.push(
        createIssue(
          "UNKNOWN_ELEMENT",
          `Unknown element symbol "${symbol}".`,
          elementStart,
        ),
      );
      return composition;
    }

    const count = parseNumber(formula, state);

    if (count === 0) {
      issues.push(
        createIssue(
          "INVALID_SUBSCRIPT",
          "Subscripts must be positive integers.",
          state.position,
        ),
      );
      return composition;
    }

    const nextCount = (composition.get(symbol) ?? 0) + count;

    if (!Number.isSafeInteger(nextCount) || nextCount <= 0) {
      issues.push(
        createIssue(
          "UNSAFE_COUNT",
          "Element count exceeds the safe integer range.",
          elementStart,
        ),
      );
      return composition;
    }

    composition.set(symbol, nextCount);
    hasContent = true;
  }

  if (!hasContent && state.position === formula.length) {
    issues.push(
      createIssue(
        "EMPTY_GROUP",
        "Formula groups cannot be empty.",
        state.position,
      ),
    );
  }

  return composition;
}

export function parseChemicalFormula(
  input: string,
): FormulaParseResult {
  if (typeof input !== "string") {
    return createParseResult("", [], [
      createIssue(
        "EMPTY_FORMULA",
        "Chemical formula must be a string.",
      ),
    ]);
  }

  const formula = input.trim();

  if (!formula) {
    return createParseResult(formula, [], [
      createIssue(
        "EMPTY_FORMULA",
        "Chemical formula cannot be empty.",
      ),
    ]);
  }

  if (formula.length > MAX_FORMULA_LENGTH) {
    return createParseResult(formula, [], [
      createIssue(
        "FORMULA_TOO_LONG",
        `Chemical formula cannot exceed ${MAX_FORMULA_LENGTH} characters.`,
        MAX_FORMULA_LENGTH,
      ),
    ]);
  }

  if (getMaximumNestingDepth(formula) > MAX_NESTING_DEPTH) {
    return createParseResult(formula, [], [
      createIssue(
        "NESTING_TOO_DEEP",
        `Formula nesting cannot exceed ${MAX_NESTING_DEPTH} levels.`,
      ),
    ]);
  }

  const issues: FormulaIssue[] = [];
  const state: FormulaParserState = { position: 0 };

  const parsed = parseGroup(formula, state, issues);

  if (state.position < formula.length) {
    const character = formula[state.position];

    if (character === ")") {
      issues.push(
        createIssue(
          "UNMATCHED_PARENTHESES",
          "Unexpected closing parenthesis.",
          state.position,
        ),
      );
    } else if (issues.length === 0) {
      issues.push(
        createIssue(
          "INVALID_TOKEN",
          `Unexpected character "${character}".`,
          state.position,
        ),
      );
    }
  }

  const composition: ElementComposition[] = [];

  for (const [symbol, count] of parsed) {
    const element = ELEMENTS_BY_SYMBOL.get(symbol);

    if (!element) {
      continue;
    }

    composition.push({
      symbol,
      atomicNumber: element.atomicNumber,
      count,
    });
  }

  return createParseResult(formula, composition, issues);
}

export type CompoundStatus =
  | "DRAFT"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "REJECTED";

const VALID_COMPOUND_STATUSES: readonly CompoundStatus[] = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "APPROVED",
  "REJECTED",
];

const COMPOUND_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CompoundSource {
  reference: string;
  publisher?: string;
  accessedAt?: string;
}

export interface ChemicalCompound {
  id: string;
  name: string;
  formula: string;
  status: CompoundStatus;
  source: CompoundSource;
  description?: string;
  approvedBy?: string;
  approvalReference?: string;
  reactionIds?: readonly string[];
}

export interface CompoundRegistryIssue {
  compoundId?: string;
  message: string;
}

export interface CompoundRegistry {
  compounds: readonly ChemicalCompound[];
  issues: readonly CompoundRegistryIssue[];
  valid: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createCompoundIssue(
  message: string,
  compoundId?: string,
): CompoundRegistryIssue {
  return Object.freeze({ message, compoundId });
}

function validateCompound(value: unknown): CompoundRegistryIssue[] {
  if (!isRecord(value)) {
    return [createCompoundIssue("Compound entry must be an object.")];
  }

  const issues: CompoundRegistryIssue[] = [];
  const compoundId =
    typeof value.id === "string" ? value.id : undefined;

  if (
    !isNonEmptyString(value.id) ||
    !COMPOUND_ID_PATTERN.test(value.id)
  ) {
    issues.push(
      createCompoundIssue(
        "Compound ID must use lowercase kebab-case.",
        compoundId,
      ),
    );
  }

  if (!isNonEmptyString(value.name)) {
    issues.push(
      createCompoundIssue("Compound name is required.", compoundId),
    );
  }

  if (!isNonEmptyString(value.formula)) {
    issues.push(
      createCompoundIssue("Compound formula is required.", compoundId),
    );
  } else {
    const parsed = parseChemicalFormula(value.formula);

    if (!parsed.valid) {
      issues.push(
        createCompoundIssue(
          `Invalid formula: ${parsed.issues
            .map((issue) => issue.message)
            .join("; ")}`,
          compoundId,
        ),
      );
    }
  }

  if (
    typeof value.status !== "string" ||
    !VALID_COMPOUND_STATUSES.includes(
      value.status as CompoundStatus,
    )
  ) {
    issues.push(
      createCompoundIssue("Compound status is invalid.", compoundId),
    );
  }

  if (!isRecord(value.source)) {
    issues.push(
      createCompoundIssue(
        "Compound source must be an object.",
        compoundId,
      ),
    );
  } else {
    if (!isNonEmptyString(value.source.reference)) {
      issues.push(
        createCompoundIssue(
          "A source reference is required.",
          compoundId,
        ),
      );
    }

    if (
      value.source.publisher !== undefined &&
      !isNonEmptyString(value.source.publisher)
    ) {
      issues.push(
        createCompoundIssue(
          "Source publisher must be non-empty when provided.",
          compoundId,
        ),
      );
    }

    if (
      value.source.accessedAt !== undefined &&
      !isNonEmptyString(value.source.accessedAt)
    ) {
      issues.push(
        createCompoundIssue(
          "Source accessedAt must be non-empty when provided.",
          compoundId,
        ),
      );
    }
  }

  if (
    value.description !== undefined &&
    typeof value.description !== "string"
  ) {
    issues.push(
      createCompoundIssue(
        "Description must be a string when provided.",
        compoundId,
      ),
    );
  }

  if (
    value.approvedBy !== undefined &&
    typeof value.approvedBy !== "string"
  ) {
    issues.push(
      createCompoundIssue(
        "approvedBy must be a string when provided.",
        compoundId,
      ),
    );
  }

  if (
    value.approvalReference !== undefined &&
    typeof value.approvalReference !== "string"
  ) {
    issues.push(
      createCompoundIssue(
        "approvalReference must be a string when provided.",
        compoundId,
      ),
    );
  }

  if (value.status === "APPROVED") {
    if (!isNonEmptyString(value.approvedBy)) {
      issues.push(
        createCompoundIssue(
          "Approved compounds require an approver.",
          compoundId,
        ),
      );
    }

    if (!isNonEmptyString(value.approvalReference)) {
      issues.push(
        createCompoundIssue(
          "Approved compounds require an approval reference.",
          compoundId,
        ),
      );
    }
  }

  if (value.reactionIds !== undefined) {
    if (!Array.isArray(value.reactionIds)) {
      issues.push(
        createCompoundIssue(
          "reactionIds must be an array when provided.",
          compoundId,
        ),
      );
    } else {
      const seenReactionIds = new Set<string>();

      for (const reactionId of value.reactionIds) {
        if (
          !isNonEmptyString(reactionId) ||
          !COMPOUND_ID_PATTERN.test(reactionId)
        ) {
          issues.push(
            createCompoundIssue(
              "Reaction links must use lowercase kebab-case identifiers.",
              compoundId,
            ),
          );
          continue;
        }

        if (seenReactionIds.has(reactionId)) {
          issues.push(
            createCompoundIssue(
              `Duplicate reaction link "${reactionId}".`,
              compoundId,
            ),
          );
        }

        seenReactionIds.add(reactionId);
      }
    }
  }

  return issues;
}

function freezeCompound(value: unknown): ChemicalCompound | undefined {
  if (
    !isRecord(value) ||
    !isRecord(value.source) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.formula !== "string" ||
    typeof value.status !== "string"
  ) {
    return undefined;
  }

  const source = Object.freeze({ ...value.source });

  const reactionIds = Array.isArray(value.reactionIds)
    ? Object.freeze([...value.reactionIds])
    : undefined;

  return Object.freeze({
    ...value,
    source,
    ...(reactionIds ? { reactionIds } : {}),
  }) as unknown as ChemicalCompound;
}

export function buildCompoundRegistry(
  compounds: readonly ChemicalCompound[],
): CompoundRegistry {
  const issues: CompoundRegistryIssue[] = [];
  const seenIds = new Set<string>();

  if (!Array.isArray(compounds)) {
    return Object.freeze({
      compounds: Object.freeze([]),
      issues: Object.freeze([
        createCompoundIssue("Registry entries must be an array."),
      ]),
      valid: false,
    });
  }

  for (const compound of compounds) {
    issues.push(...validateCompound(compound));

    if (isRecord(compound) && typeof compound.id === "string") {
      if (seenIds.has(compound.id)) {
        issues.push(
          createCompoundIssue(
            `Duplicate compound ID "${compound.id}".`,
            compound.id,
          ),
        );
      }

      seenIds.add(compound.id);
    }
  }

  const frozenCompounds = compounds
    .map(freezeCompound)
    .filter(
      (compound): compound is ChemicalCompound =>
        compound !== undefined,
    );

  const frozenIssues = Object.freeze(
    issues.map((issue) => Object.freeze({ ...issue })),
  );

  return Object.freeze({
    compounds: Object.freeze(frozenCompounds),
    issues: frozenIssues,
    valid: frozenIssues.length === 0,
  });
}

export function getCompoundElementComposition(
  compound: ChemicalCompound,
): FormulaParseResult {
  if (!compound || typeof compound.formula !== "string") {
    return createParseResult("", [], [
      createIssue(
        "EMPTY_FORMULA",
        "A valid compound formula is required.",
      ),
    ]);
  }

  return parseChemicalFormula(compound.formula);
}

export function getCompoundReactionIds(
  compound: ChemicalCompound,
): readonly string[] {
  if (!compound || !Array.isArray(compound.reactionIds)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    compound.reactionIds.filter(
      (id): id is string =>
        typeof id === "string" &&
        COMPOUND_ID_PATTERN.test(id),
    ),
  );
}

export function getApprovedCompoundById(
  registry: CompoundRegistry,
  compoundId: string,
): ChemicalCompound | undefined {
  if (
    !registry ||
    !registry.valid ||
    !Array.isArray(registry.compounds) ||
    typeof compoundId !== "string"
  ) {
    return undefined;
  }

  return registry.compounds.find(
    (compound) =>
      compound.id === compoundId &&
      compound.status === "APPROVED",
  );
}
