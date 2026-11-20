
import { describe, expect, it } from "vitest";
import {
  RUNTIME_INVENTORY_SAVE_KEY,
  RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION,
  clearRuntimeInventorySave,
  loadRuntimeInventory,
  loadRuntimeInventorySnapshot,
  saveRuntimeInventory,
  saveRuntimeInventorySnapshot,
  updateRuntimeInventoryPreservingJournal,
  type DurableInventoryTransaction,
} from "./RuntimeInventorySaveService";
import type { RuntimeInventoryState } from "./RuntimeInventorySystem";

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

function createInventory(
  resources: Record<string, number> = {},
): RuntimeInventoryState {
  return { resources };
}

function createTransaction(
  overrides: Partial<DurableInventoryTransaction> = {},
): DurableInventoryTransaction {
  return {
    transactionId: "transaction-001",
    reactionId: "reaction-001",
    expectedRevision: 0,
    status: "PREPARED",
    inventoryBefore: { "crystal-water": 2 },
    inventoryAfter: { "crystal-steam": 1 },
    fingerprint: "reaction-001:water-2:steam-1",
    ...overrides,
  };
}

describe("RuntimeInventorySaveService", () => {
  it("saves a versioned inventory envelope", () => {
    const storage = new MemoryStorage();
    const inventory = createInventory({
      "crystal-water": 5,
    });

    expect(saveRuntimeInventory(inventory, storage)).toBe(true);

    const raw = storage.getItem(RUNTIME_INVENTORY_SAVE_KEY);
    expect(raw).not.toBeNull();

    const envelope = JSON.parse(raw!);

    expect(envelope.schemaVersion).toBe(
      RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION,
    );
    expect(envelope.inventory).toEqual(inventory);
    expect(envelope.revision).toBe(0);
    expect(envelope.transactions).toEqual([]);
  });

  it("keeps removed resources removed after reload", () => {
    const storage = new MemoryStorage();

    saveRuntimeInventory(
      createInventory({
        "crystal-water": 5,
        "crystal-steam": 2,
      }),
      storage,
    );

    saveRuntimeInventory(
      createInventory({
        "crystal-water": 3,
      }),
      storage,
    );

    expect(loadRuntimeInventory(storage)).toEqual(
      createInventory({
        "crystal-water": 3,
      }),
    );
  });

  it("restores resources as a safe null-prototype record", () => {
    const storage = new MemoryStorage();

    saveRuntimeInventory(
      createInventory({
        "crystal-water": 4,
      }),
      storage,
    );

    const restored = loadRuntimeInventory(storage);

    expect(restored).not.toBeNull();
    expect(restored!.resources["crystal-water"]).toBe(4);
    expect(Object.getPrototypeOf(restored!.resources)).toBeNull();
  });

  it("rejects unsupported schema versions and invalid quantities", () => {
    const storage = new MemoryStorage();

    storage.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 999,
        inventory: createInventory(),
      }),
    );

    expect(loadRuntimeInventorySnapshot(storage)).toBeNull();

    storage.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        savedAt: Date.now(),
        inventory: createInventory({
          "crystal-water": -1,
        }),
        revision: 0,
        transactions: [],
      }),
    );

    expect(loadRuntimeInventorySnapshot(storage)).toBeNull();
  });

  it("returns null when no save exists", () => {
    const storage = new MemoryStorage();

    expect(loadRuntimeInventory(storage)).toBeNull();
    expect(loadRuntimeInventorySnapshot(storage)).toBeNull();
  });

  it("handles storage errors without throwing", () => {
    const storage = new MemoryStorage();

    storage.getItem = () => {
      throw new Error("Storage unavailable");
    };

    expect(loadRuntimeInventory(storage)).toBeNull();
    expect(loadRuntimeInventorySnapshot(storage)).toBeNull();

    storage.removeItem = () => {
      throw new Error("Storage unavailable");
    };

    expect(clearRuntimeInventorySave(storage)).toBe(false);
  });

  it("round-trips inventory, revision, and transaction journal", () => {
    const storage = new MemoryStorage();

    const snapshot = {
      inventory: createInventory({
        "crystal-water": 3,
      }),
      revision: 7,
      transactions: [createTransaction()],
    };

    expect(
      saveRuntimeInventorySnapshot(snapshot, storage),
    ).toBe(true);

    expect(loadRuntimeInventorySnapshot(storage)).toEqual(snapshot);
  });

  it("migrates a version 1 save in memory", () => {
    const storage = new MemoryStorage();

    storage.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: Date.now(),
        inventory: createInventory({
          "crystal-water": 6,
        }),
      }),
    );

    expect(loadRuntimeInventorySnapshot(storage)).toEqual({
      inventory: createInventory({
        "crystal-water": 6,
      }),
      revision: 0,
      transactions: [],
    });
  });

  it("rejects duplicate transaction IDs", () => {
    const storage = new MemoryStorage();
    const transaction = createTransaction();

    expect(
      saveRuntimeInventorySnapshot(
        {
          inventory: createInventory({
            "crystal-water": 3,
          }),
          revision: 1,
          transactions: [
            transaction,
            { ...transaction },
          ],
        },
        storage,
      ),
    ).toBe(false);
  });

  it("rejects malformed transaction journal entries", () => {
    const storage = new MemoryStorage();

    expect(
      saveRuntimeInventorySnapshot(
        {
          inventory: createInventory({
            "crystal-water": 3,
          }),
          revision: 1,
          transactions: [
            createTransaction({
              status: "INVALID" as DurableInventoryTransaction["status"],
            }),
          ],
        },
        storage,
      ),
    ).toBe(false);
  });

  it("preserves revision and journal when updating inventory", () => {
    const storage = new MemoryStorage();

    const transaction = createTransaction({
      status: "COMMITTED",
    });

    saveRuntimeInventorySnapshot(
      {
        inventory: createInventory({
          "crystal-water": 2,
        }),
        revision: 4,
        transactions: [transaction],
      },
      storage,
    );

    expect(
      updateRuntimeInventoryPreservingJournal(
        createInventory({
          "crystal-water": 1,
        }),
        storage,
      ),
    ).toBe(true);

    expect(loadRuntimeInventorySnapshot(storage)).toEqual({
      inventory: createInventory({
        "crystal-water": 1,
      }),
      revision: 4,
      transactions: [transaction],
    });
  });

  it("does not overwrite an unreadable existing save", () => {
    const storage = new MemoryStorage();

    storage.setItem(RUNTIME_INVENTORY_SAVE_KEY, "invalid-json");

    expect(
      saveRuntimeInventory(
        createInventory({
          "crystal-water": 5,
        }),
        storage,
      ),
    ).toBe(false);

    expect(storage.getItem(RUNTIME_INVENTORY_SAVE_KEY)).toBe(
      "invalid-json",
    );
  });

  it("clears the saved inventory", () => {
    const storage = new MemoryStorage();

    saveRuntimeInventory(
      createInventory({
        "crystal-water": 5,
      }),
      storage,
    );

    expect(clearRuntimeInventorySave(storage)).toBe(true);
    expect(loadRuntimeInventorySnapshot(storage)).toBeNull();
  });
});
