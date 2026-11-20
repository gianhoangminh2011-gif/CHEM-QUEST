
import {
  applyReaction,
  type ReactionDefinition,
  type ReactionErrorCode,
} from "../chemistry/ReactionEngine";

import type { RuntimeInventoryState } from "./RuntimeInventorySystem";

export type InventoryTransactionStatus =
  | "PREPARED"
  | "COMMITTED"
  | "ROLLED_BACK";

export type InventoryTransactionRecord = Readonly<{
  transactionId: string;
  reactionId: string;
  expectedRevision: number;
  status: InventoryTransactionStatus;
  inventoryBefore: Readonly<Record<string, number>>;
  inventoryAfter: Readonly<Record<string, number>>;
}>;

export type InventoryTransactionErrorCode =
  | "INVALID_TRANSACTION_ID"
  | "INVALID_REVISION"
  | "REVISION_CONFLICT"
  | "DUPLICATE_TRANSACTION_ID"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_ALREADY_ROLLED_BACK"
  | "TRANSACTION_ALREADY_COMMITTED"
  | "INVALID_MATERIAL_ID"
  | "INVALID_INVENTORY"
  | "REVISION_OVERFLOW"
  | ReactionErrorCode;

export type InventoryTransactionResult =
  | {
      success: true;
      record: InventoryTransactionRecord;
      revision: number;
    }
  | {
      success: false;
      error: InventoryTransactionErrorCode;
      message: string;
    };

type StoredTransaction = {
  record: InventoryTransactionRecord;
  fingerprint: string;
};

function freezeInventory(
  resources: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  return Object.freeze({ ...resources });
}

function isValidTransactionId(value: string): boolean {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  );
}

function isValidCrystalInventory(
  resources: Readonly<Record<string, number>>,
): boolean {
  if (
    !resources ||
    typeof resources !== "object" ||
    Array.isArray(resources)
  ) {
    return false;
  }

  return Object.entries(resources).every(
    ([resourceId, quantity]) =>
      resourceId.startsWith("crystal-") &&
      resourceId.trim() === resourceId &&
      Number.isSafeInteger(quantity) &&
      quantity >= 0,
  );
}

function fingerprintReaction(
  reaction: ReactionDefinition,
  expectedRevision: number,
): string {
  return JSON.stringify({
    id: reaction.id,
    inputs: reaction.inputs,
    outputs: reaction.outputs,
    expectedRevision,
  });
}

function failure(
  error: InventoryTransactionErrorCode,
  message: string,
): InventoryTransactionResult {
  return { success: false, error, message };
}

export class InventoryTransactionService {
  private inventory: RuntimeInventoryState;
  private revision: number;
  private readonly transactions = new Map<string, StoredTransaction>();

  constructor(
    initialInventory: RuntimeInventoryState,
    initialRevision = 0,
  ) {
    if (
      !initialInventory ||
      !isValidCrystalInventory(initialInventory.resources)
    ) {
      throw new Error("Invalid initial runtime inventory.");
    }

    if (
      !Number.isSafeInteger(initialRevision) ||
      initialRevision < 0
    ) {
      throw new Error("Invalid initial inventory revision.");
    }

    this.inventory = {
      resources: freezeInventory(initialInventory.resources),
    };
    this.revision = initialRevision;
  }

  getSnapshot(): {
    inventory: RuntimeInventoryState;
    revision: number;
  } {
    return {
      inventory: {
        resources: freezeInventory(this.inventory.resources),
      },
      revision: this.revision,
    };
  }

  prepare(
    transactionId: string,
    reaction: ReactionDefinition,
    expectedRevision = this.revision,
  ): InventoryTransactionResult {
    if (!isValidTransactionId(transactionId)) {
      return failure(
        "INVALID_TRANSACTION_ID",
        "Invalid transaction ID.",
      );
    }

    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    ) {
      return failure(
        "INVALID_REVISION",
        "Expected revision must be a non-negative safe integer.",
      );
    }

    if (
      !reaction ||
      !Array.isArray(reaction.inputs) ||
      !Array.isArray(reaction.outputs) ||
      [...reaction.inputs, ...reaction.outputs].some(
        (material) =>
          !material ||
          typeof material.resourceId !== "string" ||
          !material.resourceId.startsWith("crystal-") ||
          material.resourceId.trim() !== material.resourceId,
      )
    ) {
      return failure(
        "INVALID_MATERIAL_ID",
        "All reaction materials must use valid crystal resource IDs.",
      );
    }

    let fingerprint: string;

    try {
      fingerprint = fingerprintReaction(reaction, expectedRevision);
    } catch {
      return failure(
        "INVALID_REACTION",
        "Reaction definition cannot be serialized.",
      );
    }

    const existing = this.transactions.get(transactionId);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return failure(
          "DUPLICATE_TRANSACTION_ID",
          "Transaction ID was already used for a different request.",
        );
      }

      return {
        success: true,
        record: existing.record,
        revision: this.revision,
      };
    }

    if (expectedRevision !== this.revision) {
      return failure(
        "REVISION_CONFLICT",
        "Inventory revision changed before preparation.",
      );
    }

    const before = freezeInventory(this.inventory.resources);
    const reactionResult = applyReaction(reaction, before);

    if (!reactionResult.success) {
      return failure(
        reactionResult.error,
        reactionResult.message,
      );
    }

    if (!isValidCrystalInventory(reactionResult.inventory)) {
      return failure(
        "INVALID_MATERIAL_ID",
        "Reaction output is incompatible with runtime inventory.",
      );
    }

    const record: InventoryTransactionRecord = Object.freeze({
      transactionId,
      reactionId: reaction.id,
      expectedRevision,
      status: "PREPARED",
      inventoryBefore: before,
      inventoryAfter: freezeInventory(reactionResult.inventory),
    });

    this.transactions.set(transactionId, {
      record,
      fingerprint,
    });

    return {
      success: true,
      record,
      revision: this.revision,
    };
  }

  commit(transactionId: string): InventoryTransactionResult {
    const stored = this.transactions.get(transactionId);

    if (!stored) {
      return failure(
        "TRANSACTION_NOT_FOUND",
        "Transaction does not exist.",
      );
    }

    const current = stored.record;

    if (current.status === "COMMITTED") {
      return {
        success: true,
        record: current,
        revision: this.revision,
      };
    }

    if (current.status === "ROLLED_BACK") {
      return failure(
        "TRANSACTION_ALREADY_ROLLED_BACK",
        "A rolled-back transaction cannot be committed.",
      );
    }

    if (this.revision !== current.expectedRevision) {
      const rolledBack = this.replaceStatus(current, "ROLLED_BACK");
      stored.record = rolledBack;

      return failure(
        "REVISION_CONFLICT",
        "Inventory changed after preparation; transaction was rolled back.",
      );
    }

    if (this.revision === Number.MAX_SAFE_INTEGER) {
      return failure(
        "REVISION_OVERFLOW",
        "Inventory revision cannot be incremented safely.",
      );
    }

    this.inventory = {
      resources: freezeInventory(current.inventoryAfter),
    };

    this.revision += 1;

    const committed = this.replaceStatus(current, "COMMITTED");
    stored.record = committed;

    return {
      success: true,
      record: committed,
      revision: this.revision,
    };
  }

  rollback(transactionId: string): InventoryTransactionResult {
    const stored = this.transactions.get(transactionId);

    if (!stored) {
      return failure(
        "TRANSACTION_NOT_FOUND",
        "Transaction does not exist.",
      );
    }

    const current = stored.record;

    if (current.status === "COMMITTED") {
      return failure(
        "TRANSACTION_ALREADY_COMMITTED",
        "A committed transaction cannot be rolled back.",
      );
    }

    if (current.status === "ROLLED_BACK") {
      return {
        success: true,
        record: current,
        revision: this.revision,
      };
    }

    const rolledBack = this.replaceStatus(current, "ROLLED_BACK");
    stored.record = rolledBack;

    return {
      success: true,
      record: rolledBack,
      revision: this.revision,
    };
  }

  private replaceStatus(
    record: InventoryTransactionRecord,
    status: InventoryTransactionStatus,
  ): InventoryTransactionRecord {
    return Object.freeze({
      ...record,
      status,
    });
  }
}
