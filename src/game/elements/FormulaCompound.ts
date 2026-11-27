import { PERIODIC_TABLE_DATA } from "./PeriodicTableData";
import type { ChemicalElement } from "./ChemicalElement";

export type FormulaIssueCode =
  | "EMPTY_FORMULA"
  | "FORMULA_TOO_LONG"
  | "NESTING_TOO_DEEP"
  | "INVALID_TOKEN"
  | "UNKNOWN_ELEMENT"
  | "INVALID_SUBSCRIPT"
  | "UNMATCHED_PARENTHESES"
  | "EMPTY_GROUP"
  | "UNSAFE_COUNT"
  | "ATOM_LIMIT_EXCEEDED";

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

type MergeResult = "OK" | "UNSAFE" | "LIMIT";

const MAX_FORMULA_LENGTH = 256;
const MAX_NESTING_DEPTH = 32;
const MAX_TOTAL_ATOMS = 5000;

const ELEMENTS_BY_SYMBOL = new Map<string, ChemicalElement>(
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
  const valid = issues.length === 0 && composition.length > 0;

  const frozenComposition = Object.freeze(
    (valid ? composition : []).map((element) =>
      Object.freeze({ ...element }),
    ),
  );

  const frozenIssues = Object.freeze(
    issues.map((issue) => Object.freeze({ ...issue })),
  );

  return Object.freeze({
    valid,
    formula,
    composition: frozenComposition,
    issues: frozenIssues,
  });
}

function isDigit(character: string | undefined): boolean {
  return (
    character !== undefined &&
    character >= "0" &&
    character <= "9"
  );
}

function isUppercase(character: string | undefined): boolean {
  return (
    character !== undefined &&
    character >= "A" &&
    character <= "Z"
  );
}

function isLowercase(character: string | undefined): boolean {
  return (
    character !== undefined &&
    character >= "a" &&
    character <= "z"
  );
}

function getMaximumNestingDepth(formula: string): number {
  let currentDepth = 0;
  let maximumDepth = 0;

  for (const character of formula) {
    if (character === "(") {
      currentDepth += 1;
      maximumDepth = Math.max(
        maximumDepth,
        currentDepth,
      );
    } else if (character === ")") {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maximumDepth;
}

function getTotalAtoms(
  composition: ReadonlyMap<string, number>,
): number {
  let total = 0;

  for (const count of composition.values()) {
    total += count;

    if (!Number.isSafeInteger(total)) {
      return Number.POSITIVE_INFINITY;
    }
  }

  return total;
}

/**
 * Merges source counts into target.
 *
 * The target is changed only after all values have passed validation.
 */
function mergeCounts(
  target: Map<string, number>,
  source: ReadonlyMap<string, number>,
  multiplier: number,
): MergeResult {
  if (
    !Number.isSafeInteger(multiplier) ||
    multiplier <= 0
  ) {
    return "UNSAFE";
  }

  const updates: Array<[string, number]> = [];
  let totalAtoms = getTotalAtoms(target);

  for (const [symbol, count] of source) {
    const increment = count * multiplier;
    const nextCount =
      (target.get(symbol) ?? 0) + increment;

    if (
      !Number.isSafeInteger(increment) ||
      !Number.isSafeInteger(nextCount) ||
      increment <= 0 ||
      nextCount <= 0
    ) {
      return "UNSAFE";
    }

    totalAtoms += increment;

    if (
      !Number.isSafeInteger(totalAtoms) ||
      totalAtoms > MAX_TOTAL_ATOMS
    ) {
      return "LIMIT";
    }

    updates.push([symbol, nextCount]);
  }

  for (const [symbol, count] of updates) {
    target.set(symbol, count);
  }

  return "OK";
}

/**
 * Reads a positive integer at the current parser position.
 *
 * Returns:
 * - 1 when no number is present;
 * - the parsed positive integer when valid;
 * - 0 when the supplied number is invalid.
 */
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

  const value = Number(
    formula.slice(start, state.position),
  );

  if (!Number.isSafeInteger(value) || value <= 0) {
    return 0;
  }

  return value;
}

function pushMergeIssue(
  result: MergeResult,
  issues: FormulaIssue[],
  position: number,
): void {
  if (result === "LIMIT") {
    issues.push(
      createIssue(
        "ATOM_LIMIT_EXCEEDED",
        `A formula cannot contain more than ${MAX_TOTAL_ATOMS} atoms.`,
        position,
      ),
    );
    return;
  }

  if (result === "UNSAFE") {
    issues.push(
      createIssue(
        "UNSAFE_COUNT",
        "Element count exceeds the safe integer range.",
        position,
      ),
    );
  }
}

/**
 * Parses one formula segment.
 *
 * A segment is the part between hydrate separators.
 * Parenthesized groups are supported recursively.
 */
function parseSequence(
  formula: string,
  state: FormulaParserState,
  issues: FormulaIssue[],
  segmentOffset: number,
  stopAtClosingParenthesis: boolean,
): Map<string, number> {
  const composition = new Map<string, number>();

  while (state.position < formula.length) {
    const character = formula[state.position];

    if (character === ")") {
      if (stopAtClosingParenthesis) {
        break;
      }

      issues.push(
        createIssue(
          "UNMATCHED_PARENTHESES",
          "Unexpected closing parenthesis.",
          segmentOffset + state.position,
        ),
      );

      return composition;
    }

    if (character === "(") {
      const groupStart = state.position;

      state.position += 1;

      const nestedComposition = parseSequence(
        formula,
        state,
        issues,
        segmentOffset,
        true,
      );

      if (formula[state.position] !== ")") {
        issues.push(
          createIssue(
            "UNMATCHED_PARENTHESES",
            "Missing closing parenthesis.",
            segmentOffset + groupStart,
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
            segmentOffset + groupStart,
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
            segmentOffset + state.position,
          ),
        );

        return composition;
      }

      const mergeResult = mergeCounts(
        composition,
        nestedComposition,
        multiplier,
      );

      if (mergeResult !== "OK") {
        pushMergeIssue(
          mergeResult,
          issues,
          segmentOffset + groupStart,
        );

        return composition;
      }

      continue;
    }

    if (!isUppercase(character)) {
      issues.push(
        createIssue(
          "INVALID_TOKEN",
          `Unexpected character "${character}".`,
          segmentOffset + state.position,
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
          segmentOffset + elementStart,
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
          segmentOffset + elementStart,
        ),
      );

      return composition;
    }

    const elementCounts = new Map<string, number>([
      [symbol, count],
    ]);

    const mergeResult = mergeCounts(
      composition,
      elementCounts,
      1,
    );

    if (mergeResult !== "OK") {
      pushMergeIssue(
        mergeResult,
        issues,
        segmentOffset + elementStart,
      );

      return composition;
    }
  }

  return composition;
}

function parseFormulaSegment(
  segment: string,
  segmentOffset: number,
  segmentIndex: number,
  totalComposition: Map<string, number>,
  issues: FormulaIssue[],
): void {
  if (segment.length === 0) {
    issues.push(
      createIssue(
        "INVALID_TOKEN",
        "Hydrate separators cannot create empty formula segments.",
        segmentOffset,
      ),
    );

    return;
  }

  const state: FormulaParserState = {
    position: 0,
  };

  let segmentMultiplier = 1;

  if (segmentIndex === 0 && isDigit(segment[0])) {
    issues.push(
      createIssue(
        "INVALID_TOKEN",
        "A formula cannot begin with a coefficient.",
        segmentOffset,
      ),
    );

    return;
  }

  if (segmentIndex > 0 && isDigit(segment[0])) {
    segmentMultiplier = parseNumber(segment, state);

    if (segmentMultiplier === 0) {
      issues.push(
        createIssue(
          "INVALID_SUBSCRIPT",
          "Hydrate coefficients must be positive integers.",
          segmentOffset,
        ),
      );

      return;
    }

    if (state.position >= segment.length) {
      issues.push(
        createIssue(
          "INVALID_TOKEN",
          "A hydrate coefficient must be followed by a formula.",
          segmentOffset,
        ),
      );

      return;
    }
  }

  const segmentComposition = parseSequence(
    segment,
    state,
    issues,
    segmentOffset,
    false,
  );

  if (state.position < segment.length && issues.length === 0) {
    const character = segment[state.position];

    issues.push(
      createIssue(
        character === ")"
          ? "UNMATCHED_PARENTHESES"
          : "INVALID_TOKEN",
        character === ")"
          ? "Unexpected closing parenthesis."
          : `Unexpected character "${character}".`,
        segmentOffset + state.position,
      ),
    );

    return;
  }

  if (segmentComposition.size === 0 && issues.length === 0) {
    issues.push(
      createIssue(
        "EMPTY_FORMULA",
        "Formula segment must contain at least one element.",
        segmentOffset,
      ),
    );

    return;
  }

  if (issues.length > 0) {
    return;
  }

  const mergeResult = mergeCounts(
    totalComposition,
    segmentComposition,
    segmentMultiplier,
  );

  if (mergeResult !== "OK") {
    pushMergeIssue(
      mergeResult,
      issues,
      segmentOffset,
    );
  }
}

/**
 * Parses chemical formulas, including:
 *
 * - Simple formulas: H2O, CO2, NaCl
 * - Parenthesized groups: Ca(OH)2, Al2(SO4)3
 * - Nested groups: K4(ON(SO3)2)2
 * - Hydrates: CuSO4.5H2O
 * - Hydrates using a middle dot: CuSO4·5H2O
 *
 * A coefficient is allowed only after a hydrate separator.
 * For example, 2H2O is intentionally rejected.
 */
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

  if (
    getMaximumNestingDepth(formula) >
    MAX_NESTING_DEPTH
  ) {
    return createParseResult(formula, [], [
      createIssue(
        "NESTING_TOO_DEEP",
        `Formula nesting cannot exceed ${MAX_NESTING_DEPTH} levels.`,
      ),
    ]);
  }

  const issues: FormulaIssue[] = [];
  const totalComposition = new Map<string, number>();

  // Both the period and the Unicode middle dot are supported
  // as hydrate separators.
  const segments = formula.split(/[.·]/);

  let segmentOffset = 0;

  for (let index = 0; index < segments.length; index += 1) {
    parseFormulaSegment(
      segments[index],
      segmentOffset,
      index,
      totalComposition,
      issues,
    );

    if (issues.length > 0) {
      break;
    }

    segmentOffset += segments[index].length + 1;
  }

  const composition: ElementComposition[] = [];

  if (issues.length === 0) {
    for (const [symbol, count] of totalComposition) {
      const element = ELEMENTS_BY_SYMBOL.get(symbol);

      if (!element) {
        issues.push(
          createIssue(
            "UNKNOWN_ELEMENT",
            `Unknown element symbol "${symbol}".`,
          ),
        );
        break;
      }

      composition.push({
        symbol,
        atomicNumber: element.atomicNumber,
        count,
      });
    }
  }

  return createParseResult(
    formula,
    composition,
    issues,
  );
}

/* -------------------------------------------------------------------------- */
/* Compound registry                                                          */
/* -------------------------------------------------------------------------- */

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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function createCompoundIssue(
  message: string,
  compoundId?: string,
): CompoundRegistryIssue {
  return Object.freeze({
    message,
    compoundId,
  });
}

function validateCompound(
  value: unknown,
): CompoundRegistryIssue[] {
  if (!isRecord(value)) {
    return [
      createCompoundIssue(
        "Compound entry must be an object.",
      ),
    ];
  }

  const issues: CompoundRegistryIssue[] = [];

  const compoundId =
    typeof value.id === "string"
      ? value.id
      : undefined;

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
      createCompoundIssue(
        "Compound name is required.",
        compoundId,
      ),
    );
  }

  if (!isNonEmptyString(value.formula)) {
    issues.push(
      createCompoundIssue(
        "Compound formula is required.",
        compoundId,
      ),
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
      createCompoundIssue(
        "Compound status is invalid.",
        compoundId,
      ),
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

function freezeCompound(
  value: unknown,
): ChemicalCompound | undefined {
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

  const source = Object.freeze({
    ...value.source,
  });

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
  if (!Array.isArray(compounds)) {
    return Object.freeze({
      compounds: Object.freeze([]),
      issues: Object.freeze([
        createCompoundIssue(
          "Registry entries must be an array.",
        ),
      ]),
      valid: false,
    });
  }

  const issues: CompoundRegistryIssue[] = [];
  const seenIds = new Set<string>();

  for (const compound of compounds) {
    issues.push(...validateCompound(compound));

    if (
      isRecord(compound) &&
      typeof compound.id === "string"
    ) {
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
  if (
    !compound ||
    typeof compound.formula !== "string"
  ) {
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
  if (
    !compound ||
    !Array.isArray(compound.reactionIds)
  ) {
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