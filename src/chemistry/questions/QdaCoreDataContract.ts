
/**
 * CHEM QUEST — QDA Core Data Contract
 * TDR-01 through TDR-06
 *
 * STATUS: IMPLEMENTATION PREPARATION / CANDIDATE ONLY.
 *
 * This module is NOT:
 * - a persisted QDA schema;
 * - an API or database contract;
 * - a serialization specification;
 * - an approval of unresolved TDR decisions.
 *
 * It provides an in-memory inventory guard only.
 */

export const QDA_FIELD_NAMES = Object.freeze([
  "Question ID",
  "Template ID",
  "Topic",
  "Grade Level",
  "Curriculum",
  "Difficulty",
  "Question Type",
  "Correct Answer",
  "Explanation",
  "Parameter Rules",
  "Answer Generation Method",
  "Verification Method",
  "Mastery Node",
  "Scientific Verification",
  "Reviewer",
  "Review Date",
  "Status",
  "Language",
  "Version",
  "Source",
] as const);

export type QdaFieldName =
  (typeof QDA_FIELD_NAMES)[number];

export interface QdaCandidateFieldEntry {
  readonly fieldName: QdaFieldName;
  readonly value: unknown;
}

export type QdaCandidateIssueCode =
  | "INVALID_CONTAINER"
  | "INVALID_ENTRY"
  | "UNKNOWN_FIELD"
  | "DUPLICATE_FIELD";

export interface QdaCandidateIssue {
  readonly code: QdaCandidateIssueCode;
  readonly message: string;
  readonly index?: number;
  readonly fieldName?: string;
}

export interface QdaCandidateInspection {
  readonly valid: boolean;
  readonly entries: readonly QdaCandidateFieldEntry[];
  readonly issues: readonly QdaCandidateIssue[];
}

const QDA_FIELD_NAME_SET: ReadonlySet<string> =
  new Set(QDA_FIELD_NAMES);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function freezeInspection(
  entries: QdaCandidateFieldEntry[],
  issues: QdaCandidateIssue[],
): QdaCandidateInspection {
  return Object.freeze({
    valid: issues.length === 0,
    entries: Object.freeze(
      entries.map((entry) => Object.freeze({ ...entry })),
    ),
    issues: Object.freeze(
      issues.map((issue) => Object.freeze({ ...issue })),
    ),
  });
}

/**
 * Exact, case-sensitive membership check.
 */
export function isQdaFieldName(
  value: unknown,
): value is QdaFieldName {
  return (
    typeof value === "string" &&
    QDA_FIELD_NAME_SET.has(value)
  );
}

/**
 * Inspects transient candidate field entries.
 *
 * Intentionally does not enforce:
 * - required fields;
 * - data types;
 * - nullability;
 * - Question ID grammar;
 * - Template ID references;
 * - Topic taxonomy;
 * - serialization rules.
 */
export function inspectQdaCandidateFields(
  input: unknown,
): QdaCandidateInspection {
  if (!Array.isArray(input)) {
    return freezeInspection([], [
      {
        code: "INVALID_CONTAINER",
        message:
          "Candidate inspection input must be an array of field entries.",
      },
    ]);
  }

  const entries: QdaCandidateFieldEntry[] = [];
  const issues: QdaCandidateIssue[] = [];
  const seen = new Set<string>();

  input.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      issues.push({
        code: "INVALID_ENTRY",
        message: "Each candidate entry must be an object.",
        index,
      });
      return;
    }

    const keys = Object.keys(candidate);

    const hasOnlySupportedEntryKeys = keys.every(
      (key) => key === "fieldName" || key === "value",
    );

    const hasFieldName =
      Object.prototype.hasOwnProperty.call(
        candidate,
        "fieldName",
      );

    const hasValue =
      Object.prototype.hasOwnProperty.call(
        candidate,
        "value",
      );

    if (
      !hasOnlySupportedEntryKeys ||
      !hasFieldName ||
      !hasValue
    ) {
      issues.push({
        code: "INVALID_ENTRY",
        message:
          "Each entry must contain only fieldName and value properties.",
        index,
      });
      return;
    }

    const fieldName = candidate.fieldName;

    if (
      typeof fieldName !== "string" ||
      !isQdaFieldName(fieldName)
    ) {
      issues.push({
        code: "UNKNOWN_FIELD",
        message:
          "Field name is not part of the corroborated QDA 20-field inventory.",
        index,
        fieldName:
          typeof fieldName === "string"
            ? fieldName
            : undefined,
      });
      return;
    }

    if (seen.has(fieldName)) {
      issues.push({
        code: "DUPLICATE_FIELD",
        message: `Field "${fieldName}" appears more than once.`,
        index,
        fieldName,
      });
      return;
    }

    seen.add(fieldName);

    entries.push({
      fieldName,
      value: candidate.value,
    });
  });

  return freezeInspection(entries, issues);
}

/**
 * Returns the controlled inventory in its original order.
 * This does not define persisted serialization order.
 */
export function getQdaFieldInventory():
  readonly QdaFieldName[] {
  return QDA_FIELD_NAMES;
}
