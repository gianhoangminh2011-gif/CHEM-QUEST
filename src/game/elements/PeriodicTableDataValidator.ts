import type {
  ChemicalElement,
  ElementCategory,
} from './ChemicalElement';

const VALID_CATEGORIES = new Set<ElementCategory>([
  'alkali-metal',
  'alkaline-earth-metal',
  'transition-metal',
  'post-transition-metal',
  'metalloid',
  'reactive-nonmetal',
  'halogen',
  'noble-gas',
  'lanthanoid',
  'actinoid',
  'unknown',
]);

const ATOMIC_WEIGHT_PATTERN = /^(?:\d+(?:\.\d+)?|\[\d+\])$/;
const SYMBOL_PATTERN = /^[A-Z][a-z]?$/;

export interface PeriodicTableValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface PeriodicTableValidationResult {
  valid: boolean;
  issues: PeriodicTableValidationIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function addIssue(
  issues: PeriodicTableValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

export function validatePeriodicTableData(
  input: unknown,
): PeriodicTableValidationResult {
  const issues: PeriodicTableValidationIssue[] = [];

  if (!Array.isArray(input)) {
    addIssue(
      issues,
      'INVALID_DATASET',
      '$',
      'Periodic table data must be an array.',
    );

    return { valid: false, issues };
  }

  if (input.length !== 118) {
    addIssue(
      issues,
      'INVALID_ELEMENT_COUNT',
      '$',
      `Expected 118 elements, received ${input.length}.`,
    );
  }

  const atomicNumbers = new Set<number>();
  const symbols = new Set<string>();
  const names = new Set<string>();

  for (let index = 0; index < input.length; index += 1) {
    const path = `$[${index}]`;
    const value: unknown = input[index];

    if (!isRecord(value)) {
      addIssue(
        issues,
        'INVALID_ELEMENT_RECORD',
        path,
        'Element record must be an object.',
      );
      continue;
    }

    const atomicNumber = value.atomicNumber;
    const symbol = value.symbol;
    const name = value.name;
    const atomicWeight = value.atomicWeight;
    const group = value.group;
    const period = value.period;
    const category = value.category;

    if (
      typeof atomicNumber !== 'number' ||
      !Number.isInteger(atomicNumber) ||
      atomicNumber < 1 ||
      atomicNumber > 118
    ) {
      addIssue(
        issues,
        'INVALID_ATOMIC_NUMBER',
        `${path}.atomicNumber`,
        'Atomic number must be an integer from 1 to 118.',
      );
    } else if (atomicNumbers.has(atomicNumber)) {
      addIssue(
        issues,
        'DUPLICATE_ATOMIC_NUMBER',
        `${path}.atomicNumber`,
        `Atomic number ${atomicNumber} is duplicated.`,
      );
    } else {
      atomicNumbers.add(atomicNumber);
    }

    if (
      typeof symbol !== 'string' ||
      !SYMBOL_PATTERN.test(symbol)
    ) {
      addIssue(
        issues,
        'INVALID_SYMBOL',
        `${path}.symbol`,
        'Symbol must contain one uppercase letter and an optional lowercase letter.',
      );
    } else {
      const normalizedSymbol = symbol.toLowerCase();

      if (symbols.has(normalizedSymbol)) {
        addIssue(
          issues,
          'DUPLICATE_SYMBOL',
          `${path}.symbol`,
          `Symbol ${symbol} is duplicated.`,
        );
      } else {
        symbols.add(normalizedSymbol);
      }
    }

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name !== name.trim()
    ) {
      addIssue(
        issues,
        'INVALID_ELEMENT_NAME',
        `${path}.name`,
        'Element name must be a non-empty trimmed string.',
      );
    } else {
      const normalizedName = name.toLowerCase();

      if (names.has(normalizedName)) {
        addIssue(
          issues,
          'DUPLICATE_ELEMENT_NAME',
          `${path}.name`,
          `Element name ${name} is duplicated.`,
        );
      } else {
        names.add(normalizedName);
      }
    }

    if (
      typeof atomicWeight !== 'string' ||
      !ATOMIC_WEIGHT_PATTERN.test(atomicWeight)
    ) {
      addIssue(
        issues,
        'INVALID_ATOMIC_WEIGHT',
        `${path}.atomicWeight`,
        'Atomic weight must be a decimal value or bracketed mass number.',
      );
    }

    if (
      group !== null &&
      (
        typeof group !== 'number' ||
        !Number.isInteger(group) ||
        group < 1 ||
        group > 18
      )
    ) {
      addIssue(
        issues,
        'INVALID_GROUP',
        `${path}.group`,
        'Group must be null or an integer from 1 to 18.',
      );
    }

    if (
      typeof period !== 'number' ||
      !Number.isInteger(period) ||
      period < 1 ||
      period > 7
    ) {
      addIssue(
        issues,
        'INVALID_PERIOD',
        `${path}.period`,
        'Period must be an integer from 1 to 7.',
      );
    }

    if (
      typeof category !== 'string' ||
      !VALID_CATEGORIES.has(category as ElementCategory)
    ) {
      addIssue(
        issues,
        'INVALID_CATEGORY',
        `${path}.category`,
        'Element category is not supported.',
      );
    } else if (
      category === 'lanthanoid' ||
      category === 'actinoid'
    ) {
      if (group !== null) {
        addIssue(
          issues,
          'INVALID_F_BLOCK_GROUP',
          `${path}.group`,
          'Lanthanoid and actinoid records must use a null group.',
        );
      }

      if (typeof atomicNumber === 'number') {
        const expectedCategory =
          atomicNumber >= 57 && atomicNumber <= 71
            ? 'lanthanoid'
            : atomicNumber >= 89 && atomicNumber <= 103
              ? 'actinoid'
              : null;

        if (category !== expectedCategory) {
          addIssue(
            issues,
            'INVALID_F_BLOCK_CLASSIFICATION',
            `${path}.category`,
            'F-block category does not match the atomic number.',
          );
        }
      }
    }
  }

  for (let atomicNumber = 1; atomicNumber <= 118; atomicNumber += 1) {
    if (!atomicNumbers.has(atomicNumber)) {
      addIssue(
        issues,
        'MISSING_ATOMIC_NUMBER',
        '$',
        `Atomic number ${atomicNumber} is missing.`,
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}