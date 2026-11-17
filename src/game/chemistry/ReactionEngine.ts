
export type ReactionMaterial = {
  resourceId: string;
  quantity: number;
};

export type ReactionDefinition = {
  id: string;
  inputs: readonly ReactionMaterial[];
  outputs: readonly ReactionMaterial[];
};

export type ReactionErrorCode =
  | "INVALID_REACTION"
  | "INVALID_INVENTORY"
  | "INSUFFICIENT_RESOURCES"
  | "INVALID_QUANTITY"
  | "DUPLICATE_RESOURCE"
  | "QUANTITY_OVERFLOW";

export type ReactionResult =
  | {
      success: true;
      reactionId: string;
      inventory: Readonly<Record<string, number>>;
    }
  | {
      success: false;
      error: ReactionErrorCode;
      message: string;
    };

// No production reactions are registered until verified data is approved.
export const REACTION_REGISTRY: readonly ReactionDefinition[] =
  Object.freeze([]);

function isValidId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value
  );
}

function isValidQuantity(value: unknown): value is number {
  return Number.isSafeInteger(value) && value > 0;
}

function validateMaterials(
  materials: readonly ReactionMaterial[]
): ReactionErrorCode | null {
  if (!Array.isArray(materials) || materials.length === 0) {
    return "INVALID_REACTION";
  }

  const seen = new Set<string>();

  for (const material of materials) {
    if (
      !material ||
      typeof material !== "object" ||
      !isValidId(material.resourceId)
    ) {
      return "INVALID_REACTION";
    }

    if (!isValidQuantity(material.quantity)) {
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
  error: ReactionErrorCode,
  message: string
): ReactionResult {
  return { success: false, error, message };
}

export function applyReaction(
  reaction: ReactionDefinition,
  inventory: Readonly<Record<string, number>>
): ReactionResult {
  if (
    !reaction ||
    typeof reaction !== "object" ||
    !isValidId(reaction.id)
  ) {
    return failure("INVALID_REACTION", "Invalid reaction definition.");
  }

  if (
    !inventory ||
    typeof inventory !== "object" ||
    Array.isArray(inventory)
  ) {
    return failure("INVALID_INVENTORY", "Invalid inventory.");
  }

  const inputError = validateMaterials(reaction.inputs);
  if (inputError) {
    return failure(inputError, "Invalid reaction inputs.");
  }

  const outputError = validateMaterials(reaction.outputs);
  if (outputError) {
    return failure(outputError, "Invalid reaction outputs.");
  }

  for (const [resourceId, quantity] of Object.entries(inventory)) {
    if (!isValidId(resourceId) || !Number.isSafeInteger(quantity) || quantity < 0) {
      return failure("INVALID_INVENTORY", "Inventory contains invalid data.");
    }
  }

  for (const input of reaction.inputs) {
    const available = inventory[input.resourceId] ?? 0;

    if (available < input.quantity) {
      return failure(
        "INSUFFICIENT_RESOURCES",
        `Not enough ${input.resourceId}.`
      );
    }
  }

  const nextInventory: Record<string, number> = {
    ...inventory,
  };

  // Consume inputs first.
  for (const input of reaction.inputs) {
    const remaining = (nextInventory[input.resourceId] ?? 0) - input.quantity;

    if (remaining === 0) {
      delete nextInventory[input.resourceId];
    } else {
      nextInventory[input.resourceId] = remaining;
    }
  }

  // Add outputs after inputs have been consumed.
  for (const output of reaction.outputs) {
    const current = nextInventory[output.resourceId] ?? 0;
    const next = current + output.quantity;

    if (!Number.isSafeInteger(next)) {
      return failure(
        "QUANTITY_OVERFLOW",
        `Output quantity overflow for ${output.resourceId}.`
      );
    }

    nextInventory[output.resourceId] = next;
  }

  return {
    success: true,
    reactionId: reaction.id,
    inventory: Object.freeze(nextInventory),
  };
}

export function getReactionById(
  reactionId: string
): ReactionDefinition | undefined {
  return REACTION_REGISTRY.find(
    (reaction) => reaction.id === reactionId
  );
}
