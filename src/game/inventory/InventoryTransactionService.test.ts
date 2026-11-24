
import { describe, expect, it } from "vitest";

import { InventoryTransactionService } from "./InventoryTransactionService";
import { RUNTIME_INVENTORY_SAVE_KEY } from "./RuntimeInventorySaveService";
import type { RuntimeInventoryState } from "./RuntimeInventorySystem";
import type { ReactionDefinition } from "../chemistry/ReactionEngine";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

class ToggleFailStorage extends MemoryStorage {
  failWrites = false;

  override setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error("Simulated storage failure");
    }

    super.setItem(key, value);
  }
}

function createInventory(
  resources: Record<string, number> = {},
): RuntimeInventoryState {
  return { resources };
}

function createService(
  resources: Record<string, number> = {},
): InventoryTransactionService {
  return new InventoryTransactionService(
    createInventory(resources),
    0,
    new MemoryStorage(),
  );
}

function systemFingerprint(
  operationId: string,
  expectedRevision: number,
  inventoryAfter: Record<string, number>,
): string {
  return JSON.stringify({
    operationId,
    expectedRevision,
    inventoryAfter: Object.fromEntries(
      Object.entries(inventoryAfter).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
  });
}

function writePreparedSystemTransaction(
  storage: MemoryStorage,
  options: {
    transactionId?: string;
    operationId?: string;
    inventoryBefore?: Record<string, number>;
    inventoryAfter?: Record<string, number>;
    fingerprint?: string;
  } = {},
): void {
  const transactionId =
    options.transactionId ?? "world-collect-crystal-water-recovery";
  const operationId =
    options.operationId ?? "system-world-collection";
  const inventoryBefore = options.inventoryBefore ?? {};
  const inventoryAfter =
    options.inventoryAfter ?? { "crystal-water": 1 };

  storage.setItem(
    RUNTIME_INVENTORY_SAVE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: Date.now(),
      inventory: { resources: inventoryBefore },
      revision: 0,
      transactions: [
        {
          transactionId,
          reactionId: operationId,
          expectedRevision: 0,
          status: "PREPARED",
          inventoryBefore,
          inventoryAfter,
          fingerprint:
            options.fingerprint ??
            systemFingerprint(operationId, 0, inventoryAfter),
        },
      ],
    }),
  );
}

const reaction: ReactionDefinition = {
  id: "test-reaction",
  inputs: [{ resourceId: "crystal-water", quantity: 2 }],
  outputs: [{ resourceId: "crystal-steam", quantity: 1 }],
};

describe("InventoryTransactionService", () => {
  it("journals a world collection and increments the revision", () => {
    const storage = new MemoryStorage();
    const service = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    const result = service.applyInventoryChange(
      "world-collect-crystal-water-01",
      "system-world-collection",
      createInventory({ "crystal-water": 1 }),
      0,
    );

    expect(result.success).toBe(true);
    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 1 },
      },
      revision: 1,
    });

    const restored = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restored.getSnapshot()).toEqual(service.getSnapshot());

    const repeated = restored.applyInventoryChange(
      "world-collect-crystal-water-01",
      "system-world-collection",
      createInventory({ "crystal-water": 1 }),
      0,
    );

    expect(repeated.success).toBe(true);
    expect(restored.getSnapshot().revision).toBe(1);
  });

  it("rejects a stale revision for a world inventory change", () => {
    const service = createService({ "crystal-water": 1 });

    const result = service.applyInventoryChange(
      "world-collect-crystal-water-02",
      "system-world-collection",
      createInventory({ "crystal-water": 2 }),
      99,
    );

    expect(result).toMatchObject({
      success: false,
      error: "REVISION_CONFLICT",
    });
    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 1 },
      },
      revision: 0,
    });
  });

  it("rejects reuse of an inventory transaction ID for different data", () => {
    const service = createService();

    expect(
      service.applyInventoryChange(
        "world-collect-crystal-water-03",
        "system-world-collection",
        createInventory({ "crystal-water": 1 }),
        0,
      ).success,
    ).toBe(true);

    expect(
      service.applyInventoryChange(
        "world-collect-crystal-water-03",
        "system-world-collection",
        createInventory({ "crystal-water": 2 }),
        0,
      ),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });
  });

  it("rejects unknown system operation IDs", () => {
    const service = createService();

    expect(
      service.applyInventoryChange(
        "world-collect-crystal-water-unknown",
        "system-unapproved-operation",
        createInventory({ "crystal-water": 1 }),
        0,
      ),
    ).toMatchObject({
      success: false,
      error: "INVALID_TRANSACTION_ID",
    });

    expect(service.getSnapshot().revision).toBe(0);
    expect(service.getSnapshot().inventory.resources).toEqual({});
  });

  it("rejects system changes that modify more than one resource", () => {
    const service = createService();

    expect(
      service.applyInventoryChange(
        "world-collect-multiple-resources",
        "system-world-collection",
        createInventory({
          "crystal-water": 1,
          "crystal-fire": 1,
        }),
        0,
      ),
    ).toMatchObject({
      success: false,
      error: "INVALID_INVENTORY",
    });

    expect(service.getSnapshot().revision).toBe(0);
    expect(service.getSnapshot().inventory.resources).toEqual({});
  });

  it("prepares without mutating inventory or revision", () => {
    const service = createService({ "crystal-water": 3 });

    const result = service.prepare("tx-001", reaction);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.record.status).toBe("PREPARED");
    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 3 },
      },
      revision: 0,
    });
  });

  it("commits once and makes repeated commit idempotent", () => {
    const service = createService({ "crystal-water": 3 });

    const prepared = service.prepare("tx-002", reaction);
    expect(prepared.success).toBe(true);

    const firstCommit = service.commit("tx-002");
    expect(firstCommit.success).toBe(true);

    const secondCommit = service.commit("tx-002");
    expect(secondCommit.success).toBe(true);

    if (!firstCommit.success || !secondCommit.success) return;

    expect(firstCommit.record.status).toBe("COMMITTED");
    expect(secondCommit.revision).toBe(1);
    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 1,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });
  });

  it("rejects insufficient materials without changing state", () => {
    const service = createService({ "crystal-water": 1 });

    const result = service.prepare("tx-003", reaction);

    expect(result).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });

    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 1 },
      },
      revision: 0,
    });
  });

  it("rolls back a prepared transaction without changing inventory", () => {
    const service = createService({ "crystal-water": 3 });

    const prepared = service.prepare("tx-004", reaction);
    expect(prepared.success).toBe(true);

    const rolledBack = service.rollback("tx-004");

    expect(rolledBack.success).toBe(true);
    if (!rolledBack.success) return;

    expect(rolledBack.record.status).toBe("ROLLED_BACK");
    expect(service.commit("tx-004")).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_ROLLED_BACK",
    });

    expect(service.getSnapshot().revision).toBe(0);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 3,
    });
  });

  it("rejects a second prepared transaction after revision changes", () => {
    const service = createService({ "crystal-water": 5 });

    const first = service.prepare("tx-005", reaction);
    const second = service.prepare("tx-006", reaction);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    const firstCommit = service.commit("tx-005");
    expect(firstCommit.success).toBe(true);

    const secondCommit = service.commit("tx-006");

    expect(secondCommit).toMatchObject({
      success: false,
      error: "REVISION_CONFLICT",
    });

    expect(service.getSnapshot().revision).toBe(1);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 3,
      "crystal-steam": 1,
    });
  });

  it("rejects reuse of a transaction ID for a different reaction", () => {
    const service = createService({ "crystal-water": 3 });

    expect(service.prepare("tx-007", reaction).success).toBe(true);

    const differentReaction: ReactionDefinition = {
      id: "different-reaction",
      inputs: [{ resourceId: "crystal-water", quantity: 1 }],
      outputs: [{ resourceId: "crystal-steam", quantity: 1 }],
    };

    expect(
      service.prepare("tx-007", differentReaction),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });
  });

  it("rejects non-crystal material IDs", () => {
    const service = createService({ "crystal-water": 3 });

    const invalidReaction: ReactionDefinition = {
      id: "invalid-reaction",
      inputs: [{ resourceId: "water", quantity: 1 }],
      outputs: [{ resourceId: "crystal-steam", quantity: 1 }],
    };

    expect(
      service.prepare("tx-008", invalidReaction),
    ).toMatchObject({
      success: false,
      error: "INVALID_MATERIAL_ID",
    });
  });

  it("does not allow rollback after commit", () => {
    const service = createService({ "crystal-water": 3 });

    service.prepare("tx-009", reaction);
    service.commit("tx-009");

    expect(service.rollback("tx-009")).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_COMMITTED",
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("rejects the same transaction ID with a different expected revision", () => {
    const service = createService({ "crystal-water": 3 });

    expect(
      service.prepare("tx-010", reaction, 0).success,
    ).toBe(true);

    expect(
      service.prepare("tx-010", reaction, 1),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("restores committed inventory and journal after service recreation", () => {
    const storage = new MemoryStorage();

    const firstService = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
      0,
      storage,
    );

    expect(firstService.prepare("tx-reload-committed", reaction).success)
      .toBe(true);
    expect(firstService.commit("tx-reload-committed").success)
      .toBe(true);

    const restoredService = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restoredService.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 1,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });

    expect(
      restoredService.commit("tx-reload-committed"),
    ).toMatchObject({
      success: true,
      record: { status: "COMMITTED" },
      revision: 1,
    });
  });

  it("recovers a valid PREPARED world collection", () => {
    const storage = new MemoryStorage();

    new InventoryTransactionService(createInventory(), 0, storage);

    writePreparedSystemTransaction(storage);

    const restoredService = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restoredService.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 1 },
      },
      revision: 1,
    });

    expect(
      restoredService.getTransaction(
        "world-collect-crystal-water-recovery",
      ),
    ).toMatchObject({
      status: "COMMITTED",
      reactionId: "system-world-collection",
    });
  });

  it("recovers a valid PREPARED inventory removal", () => {
    const storage = new MemoryStorage();

    new InventoryTransactionService(
      createInventory({ "crystal-water": 2 }),
      0,
      storage,
    );

    writePreparedSystemTransaction(storage, {
      transactionId: "inventory-remove-recovery",
      operationId: "system-inventory-remove",
      inventoryBefore: { "crystal-water": 2 },
      inventoryAfter: { "crystal-water": 1 },
    });

    const restored = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restored.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 1 },
      },
      revision: 1,
    });

    expect(
      restored.getTransaction("inventory-remove-recovery"),
    ).toMatchObject({
      status: "COMMITTED",
      reactionId: "system-inventory-remove",
    });
  });

  it("does not recover an unknown system operation", () => {
    const storage = new MemoryStorage();

    writePreparedSystemTransaction(storage, {
      operationId: "system-untrusted-operation",
    });

    const restored = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restored.getSnapshot()).toEqual({
      inventory: { resources: {} },
      revision: 0,
    });

    expect(
      restored.getTransaction("world-collect-crystal-water-recovery"),
    ).toMatchObject({
      status: "ROLLED_BACK",
    });
  });

  it("does not recover a system transaction with an invalid fingerprint", () => {
    const storage = new MemoryStorage();

    writePreparedSystemTransaction(storage, {
      fingerprint: "invalid-fingerprint",
    });

    const restored = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restored.getSnapshot()).toEqual({
      inventory: { resources: {} },
      revision: 0,
    });

    expect(
      restored.getTransaction("world-collect-crystal-water-recovery"),
    ).toMatchObject({
      status: "ROLLED_BACK",
    });
  });

  it("does not recover a system transaction that changes multiple resources", () => {
    const storage = new MemoryStorage();

    writePreparedSystemTransaction(storage, {
      inventoryAfter: {
        "crystal-water": 1,
        "crystal-fire": 1,
      },
    });

    const restored = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restored.getSnapshot()).toEqual({
      inventory: { resources: {} },
      revision: 0,
    });

    expect(
      restored.getTransaction("world-collect-crystal-water-recovery"),
    ).toMatchObject({
      status: "ROLLED_BACK",
    });
  });

  it("recovers an interrupted PREPARED reaction transaction as ROLLED_BACK", () => {
    const storage = new MemoryStorage();

    const firstService = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
      0,
      storage,
    );

    expect(firstService.prepare("tx-recovery", reaction).success).toBe(true);

    const restoredService = new InventoryTransactionService(
      createInventory(),
      0,
      storage,
    );

    expect(restoredService.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 3 },
      },
      revision: 0,
    });

    expect(restoredService.commit("tx-recovery")).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_ROLLED_BACK",
    });
  });

  it("does not mutate inventory or transaction state when commit persistence fails", () => {
    const storage = new ToggleFailStorage();

    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
      0,
      storage,
    );

    const prepared = service.prepare("tx-persistence-failure", reaction);

    expect(prepared.success).toBe(true);
    expect(service.getTransaction("tx-persistence-failure")?.status)
      .toBe("PREPARED");

    const beforeFailure = service.getSnapshot();

    storage.failWrites = true;

    const committed = service.commit("tx-persistence-failure");

    expect(committed).toMatchObject({
      success: false,
      error: "PERSISTENCE_FAILED",
    });

    expect(service.getSnapshot()).toEqual(beforeFailure);

    expect(service.getTransaction("tx-persistence-failure")?.status)
      .toBe("PREPARED");
  });

  it("rejects system changes and reaction commits when revision overflows", () => {
    const storage = new MemoryStorage();

    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
      Number.MAX_SAFE_INTEGER,
      storage,
    );

    const before = service.getSnapshot();

    const systemChange = service.applyInventoryChange(
      "world-collect-overflow",
      "system-world-collection",
      createInventory({ "crystal-water": 4 }),
      Number.MAX_SAFE_INTEGER,
    );

    expect(systemChange).toMatchObject({
      success: false,
      error: "REVISION_OVERFLOW",
    });

    expect(service.getSnapshot()).toEqual(before);

    const prepared = service.prepare(
      "tx-revision-overflow",
      reaction,
      Number.MAX_SAFE_INTEGER,
    );

    expect(prepared.success).toBe(true);

    const committed = service.commit("tx-revision-overflow");

    expect(committed).toMatchObject({
      success: false,
      error: "REVISION_OVERFLOW",
    });

    expect(service.getSnapshot()).toEqual(before);

    expect(service.getTransaction("tx-revision-overflow")?.status)
      .toBe("PREPARED");
  });
});
