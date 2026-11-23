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

function validateCompound(
  compound: ChemicalCompound,
): CompoundRegistryIssue[] {
  const issues: CompoundRegistryIssue[] = [];

  if (!compound.id.trim()) {
    issues.push({
      compoundId: compound.id,
      message: "Compound ID cannot be empty.",
    });
  }

  if (!compound.name.trim()) {
    issues.push({
      compoundId: compound.id,
      message: "Compound name cannot be empty.",
    });
  }

  if (!compound.source.reference.trim()) {
    issues.push({
      compoundId: compound.id,
      message: "A source reference is required.",
    });
  }

  const parsed = parseChemicalFormula(compound.formula);

  if (!parsed.valid) {
    issues.push({
      compoundId: compound.id,
      message: `Invalid formula: ${parsed.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    });
  }

  if (compound.status === "APPROVED") {
    if (!compound.approvedBy?.trim()) {
      issues.push({
        compoundId: compound.id,
        message: "Approved compounds require an approver.",
      });
    }

    if (!compound.approvalReference?.trim()) {
      issues.push({
        compoundId: compound.id,
        message: "Approved compounds require an approval reference.",
      });
    }
  }

  return issues;
}

export function buildCompoundRegistry(
  compounds: readonly ChemicalCompound[],
): CompoundRegistry {
  const issues: CompoundRegistryIssue[] = [];
  const seenIds = new Set<string>();

  for (const compound of compounds) {
    if (seenIds.has(compound.id)) {
      issues.push({
        compoundId: compound.id,
        message: "Duplicate compound ID.",
      });
    }

    seenIds.add(compound.id);

    issues.push(...validateCompound(compound));
  }

  const frozenCompounds = compounds.map((compound) =>
    Object.freeze({
      ...compound,
      source: Object.freeze({ ...compound.source }),
    }),
  );

  const frozenIssues = issues.map((issue) =>
    Object.freeze({ ...issue }),
  );

  return Object.freeze({
    compounds: Object.freeze(frozenCompounds),
    issues: Object.freeze(frozenIssues),
    valid: frozenIssues.length === 0,
  });
}

export function getApprovedCompoundById(
  registry: CompoundRegistry,
  compoundId: string,
): ChemicalCompound | undefined {
  if (!registry.valid) {
    return undefined;
  }

  return registry.compounds.find(
    (compound) =>
      compound.id === compoundId &&
      compound.status === "APPROVED",
  );
}