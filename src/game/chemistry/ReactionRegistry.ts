
import type { ReactionDefinition, ReactionMaterial } from "./ReactionEngine";

export type ReactionApprovalStatus =
  | "DRAFT"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "REJECTED";

export type ReactionRegistryEntry = Readonly<{
  reaction: ReactionDefinition;
  sourceReference: string;
  approvalStatus: ReactionApprovalStatus;
  approvedBy?: string;
  approvalReference?: string;
}>;

export type ReactionRegistryErrorCode =
  | "INVALID_ENTRY"
  | "DUPLICATE_REACTION_ID"
  | "INVALID_REACTION_ID"
  | "INVALID_SOURCE_REFERENCE"
  | "INVALID_APPROVAL_STATUS"
  | "MISSING_APPROVAL_METADATA"
  | "INVALID_MATERIAL"
  | "INVALID_MATERIAL_ID"
  | "INVALID_QUANTITY"
  | "DUPLICATE_RESOURCE";

export type ReactionRegistryResult =
  | {
      success: true;
      entries: readonly ReactionRegistryEntry[];
    }
  | {
      success: false;
      error: ReactionRegistryErrorCode;
      message: string;
    };

const VALID_APPROVAL_STATUSES: readonly ReactionApprovalStatus[] =
  Object.freeze([
    "DRAFT",
    "REVIEW_REQUIRED",
    "APPROVED",
    "REJECTED",
  ]);

function isValidIdentifier(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  ) {
    return false;
  }

  return (
    value !== "__proto__" &&
    value !== "prototype" &&
    !Object.prototype.hasOwnProperty.call(Object.prototype, value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateMaterials(
  materials: readonly ReactionMaterial[],
): ReactionRegistryErrorCode | null {
  if (!Array.isArray(materials) || materials.length === 0) {
    return "INVALID_MATERIAL";
  }

  const seen = new Set<string>();

  for (const material of materials) {
    if (!material || typeof material !== "object") {
      return "INVALID_MATERIAL";
    }

    if (
      typeof material.resourceId !== "string" ||
      !material.resourceId.startsWith("crystal-") ||
      material.resourceId.trim() !== material.resourceId ||
      !isValidIdentifier(material.resourceId)
    ) {
      return "INVALID_MATERIAL_ID";
    }

    if (
      !Number.isSafeInteger(material.quantity) ||
      material.quantity <= 0
    ) {
      return "INVALID_QUANTITY";
    }

    if (seen.has(material.resourceId)) {
      return "DUPLICATE_RESOURCE";
    }

    seen.add(material.resourceId);
  }

  return null;
}

function failure(
  error: ReactionRegistryErrorCode,
  message: string,
): ReactionRegistryResult {
  return {
    success: false,
    error,
    message,
  };
}

function freezeEntry(
  entry: ReactionRegistryEntry,
): ReactionRegistryEntry {
  const inputs = Object.freeze(
    entry.reaction.inputs.map((material) =>
      Object.freeze({ ...material }),
    ),
  );

  const outputs = Object.freeze(
    entry.reaction.outputs.map((material) =>
      Object.freeze({ ...material }),
    ),
  );

  const reaction = Object.freeze({
    id: entry.reaction.id,
    inputs,
    outputs,
  });

  return Object.freeze({
    reaction,
    sourceReference: entry.sourceReference,
    approvalStatus: entry.approvalStatus,
    ...(entry.approvedBy !== undefined
      ? { approvedBy: entry.approvedBy }
      : {}),
    ...(entry.approvalReference !== undefined
      ? { approvalReference: entry.approvalReference }
      : {}),
  });
}

export function buildReactionRegistry(
  entries: readonly ReactionRegistryEntry[],
): ReactionRegistryResult {
  if (!Array.isArray(entries)) {
    return failure("INVALID_ENTRY", "Registry entries must be an array.");
  }

  const seenReactionIds = new Set<string>();
  const validatedEntries: ReactionRegistryEntry[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || !entry.reaction) {
      return failure("INVALID_ENTRY", "Invalid registry entry.");
    }

    const reaction = entry.reaction;

    if (!isValidIdentifier(reaction.id)) {
      return failure("INVALID_REACTION_ID", "Invalid reaction ID.");
    }

    if (seenReactionIds.has(reaction.id)) {
      return failure(
        "DUPLICATE_REACTION_ID",
        `Duplicate reaction ID: ${reaction.id}.`,
      );
    }

    if (!isNonEmptyString(entry.sourceReference)) {
      return failure(
        "INVALID_SOURCE_REFERENCE",
        "Every reaction requires a source reference.",
      );
    }

    if (
      !VALID_APPROVAL_STATUSES.includes(entry.approvalStatus)
    ) {
      return failure(
        "INVALID_APPROVAL_STATUS",
        "Invalid reaction approval status.",
      );
    }

    if (
      entry.approvalStatus === "APPROVED" &&
      (!isNonEmptyString(entry.approvedBy) ||
        !isNonEmptyString(entry.approvalReference))
    ) {
      return failure(
        "MISSING_APPROVAL_METADATA",
        "Approved reactions require approvedBy and approvalReference.",
      );
    }

    const inputError = validateMaterials(reaction.inputs);

    if (inputError) {
      return failure(inputError, "Invalid reaction inputs.");
    }

    const outputError = validateMaterials(reaction.outputs);

    if (outputError) {
      return failure(outputError, "Invalid reaction outputs.");
    }

    seenReactionIds.add(reaction.id);
    validatedEntries.push(freezeEntry(entry));
  }

  return {
    success: true,
    entries: Object.freeze(validatedEntries),
  };
}

// No production reactions until verified data is approved.
export const REACTION_REGISTRY_ENTRIES: readonly ReactionRegistryEntry[] =
  Object.freeze([]);

export function getApprovedReactionById(
  reactionId: string,
  registry: readonly ReactionRegistryEntry[] =
    REACTION_REGISTRY_ENTRIES,
): ReactionDefinition | undefined {
  if (!isValidIdentifier(reactionId)) {
    return undefined;
  }

  const entry = registry.find(
    (candidate) =>
      candidate.reaction.id === reactionId &&
      candidate.approvalStatus === "APPROVED",
  );

  return entry?.reaction;
}
