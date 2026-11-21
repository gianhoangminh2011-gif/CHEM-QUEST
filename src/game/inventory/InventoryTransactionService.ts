
import {
  applyReaction,
  type ReactionDefinition,
  type ReactionErrorCode,
} from "../chemistry/ReactionEngine";
import type { RuntimeInventoryState } from "./RuntimeInventorySystem";
import {
  RUNTIME_INVENTORY_SAVE_KEY,
  loadRuntimeInventorySnapshot,
  saveRuntimeInventorySnapshot,
  type DurableInventoryTransaction,
  type RuntimeInventoryDurableSnapshot,
} from "./RuntimeInventorySaveService";

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
  | "PERSISTENCE_FAILED"
  | "PERSISTENCE_UNAVAILABLE"
  | "CORRUPTED_SAVE"
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

function sameInventory(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if ((left[key] ?? 0) !== (right[key] ?? 0)) {
      return false;
    }
  }

  return true;
}

function validTransactionId(value: string): boolean {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  );
}

function validInventory(
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
    ([id, quantity]) =>
      id.startsWith("crystal-") &&
      id.trim() === id &&
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

function resolveStorage(storage?: Storage): Storage {
  if (storage) return storage;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Access to browser storage can itself throw.
  }

  throw new Error("Durable inventory storage is unavailable.");
}

export class InventoryTransactionService {
  private inventory: RuntimeInventoryState;
  private revision: number;
  private readonly transactions = new Map<string, StoredTransaction>();
  private readonly storage: Storage;

  constructor(
    initialInventory: RuntimeInventoryState,
    initialRevision = 0,
    storage?: Storage,
  ) {
    if (!validInventory(initialInventory?.resources)) {
      throw new Error("Invalid initial runtime inventory.");
    }

    if (!Number.isSafeInteger(initialRevision) || initialRevision < 0) {
      throw new Error("Invalid initial inventory revision.");
    }

    this.storage = resolveStorage(storage);

    let raw: string | null;

    try {
      raw = this.storage.getItem(RUNTIME_INVENTORY_SAVE_KEY);
    } catch {
      throw new Error("Unable to read durable inventory storage.");
    }

    const loaded = loadRuntimeInventorySnapshot(this.storage);

    if (loaded) {
      this.inventory = {
        resources: freezeInventory(loaded.inventory.resources),
      };
      this.revision = loaded.revision;

      for (const item of loaded.transactions) {
        const record: InventoryTransactionRecord = Object.freeze({
          transactionId: item.transactionId,
          reactionId: item.reactionId,
          expectedRevision: item.expectedRevision,
          status: item.status,
          inventoryBefore: freezeInventory(item.inventoryBefore),
          inventoryAfter: freezeInventory(item.inventoryAfter),
        });

        this.transactions.set(item.transactionId, {
          record,
          fingerprint: item.fingerprint,
        });
      }

      this.recoverPreparedTransactions();
      return;
    }

    if (raw !== null) {
      throw new Error("Corrupted inventory save; refusing to overwrite.");
    }

    this.inventory = {
      resources: freezeInventory(initialInventory.resources),
    };
    this.revision = initialRevision;

    if (!this.persist(this.inventory, this.revision, [])) {
      throw new Error("Unable to initialize durable inventory storage.");
    }
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

  getTransaction(
    transactionId: string,
  ): InventoryTransactionRecord | null {
    const stored = this.transactions.get(transactionId);
    return stored?.record ?? null;
  }

  // Returns a read-only snapshot of the durable transaction journal.
  getTransactions(): readonly InventoryTransactionRecord[] {
    return Object.freeze(
      [...this.transactions.values()].map((stored) => stored.record),
    );
  }

  private toDurable(
    stored: StoredTransaction,
  ): DurableInventoryTransaction {
    const record = stored.record;

    return {
      transactionId: record.transactionId,
      reactionId: record.reactionId,
      expectedRevision: record.expectedRevision,
      status: record.status,
      inventoryBefore: record.inventoryBefore,
      inventoryAfter: record.inventoryAfter,
      fingerprint: stored.fingerprint,
    };
  }

  private persist(
    inventory: RuntimeInventoryState,
    revision: number,
    transactions: readonly StoredTransaction[],
  ): boolean {
    const snapshot: RuntimeInventoryDurableSnapshot = {
      inventory,
      revision,
      transactions: transactions.map((item) => this.toDurable(item)),
    };

    return saveRuntimeInventorySnapshot(snapshot, this.storage);
  }

  private recoverPreparedTransactions(): void {
    let recoveredInventory: RuntimeInventoryState = {
      resources: freezeInventory(this.inventory.resources),
    };
    let recoveredRevision = this.revision;
    let changed = false;

    const recovered = [...this.transactions.values()].map((stored) => {
      const record = stored.record;

      if (record.status !== "PREPARED") return stored;

      changed = true;

      const isSystemTransaction =
        record.reactionId.startsWith("system-");

      const canCompleteSystemTransaction =
        isSystemTransaction &&
        recoveredRevision === record.expectedRevision &&
        recoveredRevision < Number.MAX_SAFE_INTEGER &&
        sameInventory(
          recoveredInventory.resources,
          record.inventoryBefore,
        );

      if (canCompleteSystemTransaction) {
        recoveredInventory = {
          resources: freezeInventory(record.inventoryAfter),
        };
        recoveredRevision += 1;

        return {
          ...stored,
          record: this.replaceStatus(record, "COMMITTED"),
        };
      }

      return {
        ...stored,
        record: this.replaceStatus(record, "ROLLED_BACK"),
      };
    });

    if (!changed) return;

    if (!this.persist(recoveredInventory, recoveredRevision, recovered)) {
      throw new Error("Unable to persist transaction recovery.");
    }

    this.inventory = {
      resources: freezeInventory(recoveredInventory.resources),
    };
    this.revision = recoveredRevision;

    this.transactions.clear();

    for (const stored of recovered) {
      this.transactions.set(stored.record.transactionId, stored);
    }
  }

  prepare(
    transactionId: string,
    reaction: ReactionDefinition,
    expectedRevision = this.revision,
  ): InventoryTransactionResult {
    if (!validTransactionId(transactionId)) {
      return failure("INVALID_TRANSACTION_ID", "Invalid transaction ID.");
    }

    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      return failure("INVALID_REVISION", "Invalid expected revision.");
    }

    if (
      !reaction ||
      typeof reaction.id !== "string" ||
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
      return failure("INVALID_MATERIAL_ID", "Invalid reaction material ID.");
    }

    let fingerprint: string;

    try {
      fingerprint = fingerprintReaction(reaction, expectedRevision);
    } catch {
      return failure("INVALID_REACTION", "Invalid reaction definition.");
    }

    const existing = this.transactions.get(transactionId);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return failure(
          "DUPLICATE_TRANSACTION_ID",
          "Transaction ID belongs to a different request.",
        );
      }

      return {
        success: true,
        record: existing.record,
        revision: this.revision,
      };
    }

    if (expectedRevision !== this.revision) {
      return failure("REVISION_CONFLICT", "Inventory revision conflict.");
    }

    const before = freezeInventory(this.inventory.resources);
    const result = applyReaction(reaction, before);

    if (!result.success) {
      return failure(result.error, result.message);
    }

    if (!validInventory(result.inventory)) {
      return failure("INVALID_INVENTORY", "Invalid reaction output.");
    }

    const record: InventoryTransactionRecord = Object.freeze({
      transactionId,
      reactionId: reaction.id,
      expectedRevision,
      status: "PREPARED",
      inventoryBefore: before,
      inventoryAfter: freezeInventory(result.inventory),
    });

    const stored: StoredTransaction = {
      record,
      fingerprint,
    };

    const nextTransactions = [
      ...this.transactions.values(),
      stored,
    ];

    if (!this.persist(this.inventory, this.revision, nextTransactions)) {
      return failure(
        "PERSISTENCE_FAILED",
        "Could not persist PREPARED transaction.",
      );
    }

    this.transactions.set(transactionId, stored);

    return {
      success: true,
      record,
      revision: this.revision,
    };
  }

  applyInventoryChange(
    transactionId: string,
    operationId: string,
    nextInventory: RuntimeInventoryState,
    expectedRevision = this.revision,
  ): InventoryTransactionResult {
    if (!validTransactionId(transactionId)) {
      return failure("INVALID_TRANSACTION_ID", "Invalid transaction ID.");
    }

    if (
      !validTransactionId(operationId) ||
      !operationId.startsWith("system-")
    ) {
      return failure("INVALID_TRANSACTION_ID", "Invalid system operation ID.");
    }

    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      return failure("INVALID_REVISION", "Invalid expected revision.");
    }

    if (!validInventory(nextInventory?.resources)) {
      return failure("INVALID_INVENTORY", "Invalid inventory change.");
    }

    const normalizedAfter = freezeInventory(nextInventory.resources);
    const fingerprint = JSON.stringify({
      operationId,
      expectedRevision,
      inventoryAfter: Object.fromEntries(
        Object.entries(normalizedAfter).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      ),
    });

    const existing = this.transactions.get(transactionId);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return failure(
          "DUPLICATE_TRANSACTION_ID",
          "Transaction ID belongs to a different inventory change.",
        );
      }

      if (existing.record.status === "ROLLED_BACK") {
        return failure(
          "TRANSACTION_ALREADY_ROLLED_BACK",
          "This inventory change was already rolled back.",
        );
      }

      if (existing.record.status === "COMMITTED") {
        return {
          success: true,
          record: existing.record,
          revision: this.revision,
        };
      }

      return this.commit(transactionId);
    }

    if (expectedRevision !== this.revision) {
      return failure("REVISION_CONFLICT", "Inventory revision conflict.");
    }

    if (this.revision === Number.MAX_SAFE_INTEGER) {
      return failure("REVISION_OVERFLOW", "Revision overflow.");
    }

    const record: InventoryTransactionRecord = Object.freeze({
      transactionId,
      reactionId: operationId,
      expectedRevision,
      status: "PREPARED",
      inventoryBefore: freezeInventory(this.inventory.resources),
      inventoryAfter: normalizedAfter,
    });

    const stored: StoredTransaction = {
      record,
      fingerprint,
    };

    const nextTransactions = [
      ...this.transactions.values(),
      stored,
    ];

    if (!this.persist(this.inventory, this.revision, nextTransactions)) {
      return failure(
        "PERSISTENCE_FAILED",
        "Could not persist PREPARED inventory change.",
      );
    }

    this.transactions.set(transactionId, stored);

    return this.commit(transactionId);
  }

  commit(transactionId: string): InventoryTransactionResult {
    const stored = this.transactions.get(transactionId);

    if (!stored) {
      return failure("TRANSACTION_NOT_FOUND", "Transaction not found.");
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
        "Rolled-back transaction cannot be committed.",
      );
    }

    if (this.revision !== current.expectedRevision) {
      const rolledBack = this.replaceStatus(current, "ROLLED_BACK");
      const nextStored = { ...stored, record: rolledBack };
      const nextTransactions = [...this.transactions.values()].map(
        (item) => item === stored ? nextStored : item,
      );

      if (!this.persist(this.inventory, this.revision, nextTransactions)) {
        return failure("PERSISTENCE_FAILED", "Could not persist rollback.");
      }

      stored.record = rolledBack;

      return failure("REVISION_CONFLICT", "Transaction revision conflict.");
    }

    if (this.revision === Number.MAX_SAFE_INTEGER) {
      return failure("REVISION_OVERFLOW", "Revision overflow.");
    }

    const nextRevision = this.revision + 1;
    const nextInventory: RuntimeInventoryState = {
      resources: freezeInventory(current.inventoryAfter),
    };

    const committed = this.replaceStatus(current, "COMMITTED");
    const nextStored = { ...stored, record: committed };

    const nextTransactions = [...this.transactions.values()].map(
      (item) => item === stored ? nextStored : item,
    );

    if (!this.persist(nextInventory, nextRevision, nextTransactions)) {
      return failure(
        "PERSISTENCE_FAILED",
        "Commit was not applied because durable storage failed.",
      );
    }

    this.inventory = nextInventory;
    this.revision = nextRevision;
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
      return failure("TRANSACTION_NOT_FOUND", "Transaction not found.");
    }

    const current = stored.record;

    if (current.status === "COMMITTED") {
      return failure(
        "TRANSACTION_ALREADY_COMMITTED",
        "Committed transaction cannot be rolled back.",
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
    const nextStored = { ...stored, record: rolledBack };

    const nextTransactions = [...this.transactions.values()].map(
      (item) => item === stored ? nextStored : item,
    );

    if (!this.persist(this.inventory, this.revision, nextTransactions)) {
      return failure("PERSISTENCE_FAILED", "Could not persist rollback.");
    }

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
