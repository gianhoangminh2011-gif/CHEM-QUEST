import type { RuntimeInventoryState } from "./RuntimeInventorySystem";

export const RUNTIME_INVENTORY_SAVE_KEY =
  "chem-quest:runtime-inventory-save";

export const RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION = 2;

export type DurableTransactionStatus =
  | "PREPARED"
  | "COMMITTED"
  | "ROLLED_BACK";

export type DurableInventoryTransaction = Readonly<{
  transactionId: string;
  reactionId: string;
  expectedRevision: number;
  status: DurableTransactionStatus;
  inventoryBefore: Readonly<Record<string, number>>;
  inventoryAfter: Readonly<Record<string, number>>;
  fingerprint: string;
}>;

export type RuntimeInventoryDurableSnapshot = Readonly<{
  inventory: RuntimeInventoryState;
  revision: number;
  transactions: readonly DurableInventoryTransaction[];
}>;

type SaveEnvelopeV1 = {
  schemaVersion: 1;
  savedAt: number;
  inventory: RuntimeInventoryState;
};

type SaveEnvelopeV2 = {
  schemaVersion: 2;
  savedAt: number;
  inventory: RuntimeInventoryState;
  revision: number;
  transactions: readonly DurableInventoryTransaction[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isInventory(value: unknown): value is RuntimeInventoryState {
  if (!isRecord(value) || !isRecord(value.resources)) {
    return false;
  }

  return Object.entries(value.resources).every(([id, quantity]) =>
    id.startsWith("crystal-") &&
    id.trim() === id &&
    Number.isSafeInteger(quantity) &&
    (quantity as number) >= 0
  );
}

function isTransaction(
  value: unknown,
): value is DurableInventoryTransaction {
  if (!isRecord(value)) return false;

  return (
    typeof value.transactionId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value.transactionId) &&
    typeof value.reactionId === "string" &&
    Number.isSafeInteger(value.expectedRevision) &&
    (value.expectedRevision as number) >= 0 &&
    ["PREPARED", "COMMITTED", "ROLLED_BACK"].includes(
      String(value.status),
    ) &&
    isInventory({ resources: value.inventoryBefore }) &&
    isInventory({ resources: value.inventoryAfter }) &&
    typeof value.fingerprint === "string" &&
    value.fingerprint.length > 0
  );
}

function normalizeInventory(
  inventory: RuntimeInventoryState,
): RuntimeInventoryState {
  const resources = Object.create(null) as Record<string, number>;

  for (const [id, quantity] of Object.entries(inventory.resources)) {
    resources[id] = quantity;
  }

  return { resources };
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;

  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveRuntimeInventorySnapshot(
  snapshot: RuntimeInventoryDurableSnapshot,
  storage?: Storage,
): boolean {
  const target = getStorage(storage);

  if (
    !target ||
    !snapshot ||
    !isInventory(snapshot.inventory) ||
    !Number.isSafeInteger(snapshot.revision) ||
    snapshot.revision < 0 ||
    !Array.isArray(snapshot.transactions) ||
    !snapshot.transactions.every(isTransaction)
  ) {
    return false;
  }

  const ids = snapshot.transactions.map(
    (item) => item.transactionId,
  );

  if (new Set(ids).size !== ids.length) return false;

  const envelope: SaveEnvelopeV2 = {
    schemaVersion: 2,
    savedAt: Date.now(),
    inventory: normalizeInventory(snapshot.inventory),
    revision: snapshot.revision,
    transactions: snapshot.transactions.map((item) => ({
      ...item,
      inventoryBefore: { ...item.inventoryBefore },
      inventoryAfter: { ...item.inventoryAfter },
    })),
  };

  try {
    target.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify(envelope),
    );

    return true;
  } catch {
    return false;
  }
}

export function loadRuntimeInventorySnapshot(
  storage?: Storage,
): RuntimeInventoryDurableSnapshot | null {
  const target = getStorage(storage);

  if (!target) return null;

  try {
    const raw = target.getItem(RUNTIME_INVENTORY_SAVE_KEY);

    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) return null;

    if (parsed.schemaVersion === 1) {
      const legacy = parsed as unknown as SaveEnvelopeV1;

      if (!isInventory(legacy.inventory)) return null;

      return {
        inventory: normalizeInventory(legacy.inventory),
        revision: 0,
        transactions: [],
      };
    }

    if (
      parsed.schemaVersion !== 2 ||
      !isInventory(parsed.inventory) ||
      !Number.isSafeInteger(parsed.revision) ||
      (parsed.revision as number) < 0 ||
      !Array.isArray(parsed.transactions) ||
      !parsed.transactions.every(isTransaction)
    ) {
      return null;
    }

    const transactions =
      parsed.transactions as DurableInventoryTransaction[];

    const ids = transactions.map(
      (item) => item.transactionId,
    );

    if (new Set(ids).size !== ids.length) return null;

    return {
      inventory: normalizeInventory(parsed.inventory),
      revision: parsed.revision as number,
      transactions,
    };
  } catch {
    return null;
  }
}

/**
 * Updates inventory while preserving the current revision
 * and durable transaction journal.
 */
export function updateRuntimeInventoryPreservingJournal(
  inventory: RuntimeInventoryState,
  storage?: Storage,
): boolean {
  const target = getStorage(storage);

  if (!target || !isInventory(inventory)) {
    return false;
  }

  try {
    const raw = target.getItem(RUNTIME_INVENTORY_SAVE_KEY);
    const current = loadRuntimeInventorySnapshot(target);

    // Never overwrite a present but unreadable save.
    if (raw !== null && current === null) {
      return false;
    }

    return saveRuntimeInventorySnapshot(
      {
        inventory: normalizeInventory(inventory),
        revision: current?.revision ?? 0,
        transactions: current?.transactions ?? [],
      },
      target,
    );
  } catch {
    return false;
  }
}

export function saveRuntimeInventory(
  inventory: RuntimeInventoryState,
  storage?: Storage,
): boolean {
  return saveRuntimeInventorySnapshot(
    {
      inventory,
      revision: 0,
      transactions: [],
    },
    storage,
  );
}

export function loadRuntimeInventory(
  storage?: Storage,
): RuntimeInventoryState | null {
  return (
    loadRuntimeInventorySnapshot(storage)?.inventory ?? null
  );
}

export function clearRuntimeInventorySave(
  storage?: Storage,
): boolean {
  const target = getStorage(storage);

  if (!target) return false;

  try {
    target.removeItem(RUNTIME_INVENTORY_SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}