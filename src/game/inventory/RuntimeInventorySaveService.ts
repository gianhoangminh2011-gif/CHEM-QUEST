import type { RuntimeInventoryState } from "./RuntimeInventorySystem";

export const RUNTIME_INVENTORY_SAVE_KEY =
  "chem-quest:runtime-inventory-save";

export const RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION = 2;

export type DurableInventoryTransaction = Readonly<{
  transactionId: string;
  reactionId: string;
  expectedRevision: number;
  status: "PREPARED" | "COMMITTED" | "ROLLED_BACK";
  inventoryBefore: Readonly<Record<string, number>>;
  inventoryAfter: Readonly<Record<string, number>>;
  fingerprint: string;
}>;

export type RuntimeInventoryDurableSnapshot = Readonly<{
  inventory: RuntimeInventoryState;
  revision: number;
  transactions: readonly DurableInventoryTransaction[];
}>;

type SaveEnvelope = {
  schemaVersion: number;
  savedAt: number;
  inventory: RuntimeInventoryState;
  revision: number;
  transactions: DurableInventoryTransaction[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
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

function normalizeResources(
  value: unknown,
): Record<string, number> | null {
  if (!isRecord(value)) return null;

  const resources = Object.create(null) as Record<string, number>;

  for (const [resourceId, quantity] of Object.entries(value)) {
    if (
      !resourceId.startsWith("crystal-") ||
      resourceId.trim() !== resourceId ||
      !Number.isSafeInteger(quantity) ||
      (quantity as number) < 0
    ) {
      return null;
    }

    resources[resourceId] = quantity as number;
  }

  return resources;
}

function normalizeInventory(
  value: unknown,
): RuntimeInventoryState | null {
  if (!isRecord(value)) return null;

  const resources = normalizeResources(value.resources);

  if (!resources) return null;

  return { resources };
}

function isValidTransaction(
  value: unknown,
): value is DurableInventoryTransaction {
  if (!isRecord(value)) return false;

  if (
    typeof value.transactionId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value.transactionId) ||
    typeof value.reactionId !== "string" ||
    value.reactionId.length === 0 ||
    !Number.isSafeInteger(value.expectedRevision) ||
    (value.expectedRevision as number) < 0 ||
    !["PREPARED", "COMMITTED", "ROLLED_BACK"].includes(
      String(value.status),
    ) ||
    typeof value.fingerprint !== "string" ||
    value.fingerprint.length === 0
  ) {
    return false;
  }

  return (
    normalizeResources(value.inventoryBefore) !== null &&
    normalizeResources(value.inventoryAfter) !== null
  );
}

function normalizeTransaction(
  value: DurableInventoryTransaction,
): DurableInventoryTransaction {
  return {
    transactionId: value.transactionId,
    reactionId: value.reactionId,
    expectedRevision: value.expectedRevision,
    status: value.status,
    inventoryBefore: normalizeResources(value.inventoryBefore)!,
    inventoryAfter: normalizeResources(value.inventoryAfter)!,
    fingerprint: value.fingerprint,
  };
}

function parseSnapshot(
  raw: string,
): RuntimeInventoryDurableSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) return null;

    const inventory = normalizeInventory(parsed.inventory);

    if (!inventory) return null;

    // Migrate version 1 in memory.
    if (parsed.schemaVersion === 1) {
      return {
        inventory,
        revision: 0,
        transactions: [],
      };
    }

    if (
      parsed.schemaVersion !== RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION ||
      !Number.isSafeInteger(parsed.revision) ||
      (parsed.revision as number) < 0 ||
      !Array.isArray(parsed.transactions)
    ) {
      return null;
    }

    const transactions: DurableInventoryTransaction[] = [];
    const transactionIds = new Set<string>();

    for (const item of parsed.transactions) {
      if (!isValidTransaction(item)) return null;

      if (transactionIds.has(item.transactionId)) {
        return null;
      }

      transactionIds.add(item.transactionId);
      transactions.push(normalizeTransaction(item));
    }

    return {
      inventory,
      revision: parsed.revision as number,
      transactions,
    };
  } catch {
    return null;
  }
}

export function loadRuntimeInventorySnapshot(
  storage?: Storage,
): RuntimeInventoryDurableSnapshot | null {
  const target = getStorage(storage);

  if (!target) return null;

  try {
    const raw = target.getItem(RUNTIME_INVENTORY_SAVE_KEY);

    if (raw === null) return null;

    return parseSnapshot(raw);
  } catch {
    return null;
  }
}

export function loadRuntimeInventory(
  storage?: Storage,
): RuntimeInventoryState | null {
  return loadRuntimeInventorySnapshot(storage)?.inventory ?? null;
}

function writeSnapshot(
  snapshot: RuntimeInventoryDurableSnapshot,
  storage?: Storage,
): boolean {
  const target = getStorage(storage);

  if (!target) return false;

  const inventory = normalizeInventory(snapshot.inventory);

  if (
    !inventory ||
    !Number.isSafeInteger(snapshot.revision) ||
    snapshot.revision < 0 ||
    !Array.isArray(snapshot.transactions)
  ) {
    return false;
  }

  const transactions: DurableInventoryTransaction[] = [];
  const transactionIds = new Set<string>();

  for (const item of snapshot.transactions) {
    if (!isValidTransaction(item)) return false;

    if (transactionIds.has(item.transactionId)) {
      return false;
    }

    transactionIds.add(item.transactionId);
    transactions.push(normalizeTransaction(item));
  }

  const envelope: SaveEnvelope = {
    schemaVersion: RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    inventory,
    revision: snapshot.revision,
    transactions,
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

export function saveRuntimeInventorySnapshot(
  snapshot: RuntimeInventoryDurableSnapshot,
  storage?: Storage,
): boolean {
  return writeSnapshot(snapshot, storage);
}

export function saveRuntimeInventory(
  inventory: RuntimeInventoryState,
  storage?: Storage,
): boolean {
  const normalized = normalizeInventory(inventory);

  if (!normalized) return false;

  const target = getStorage(storage);

  if (!target) return false;

  try {
    const raw = target.getItem(RUNTIME_INVENTORY_SAVE_KEY);

    // Do not overwrite a corrupted existing save.
    if (raw !== null && parseSnapshot(raw) === null) {
      return false;
    }

    return writeSnapshot(
      {
        inventory: normalized,
        revision: 0,
        transactions: [],
      },
      target,
    );
  } catch {
    return false;
  }
}

export function updateRuntimeInventoryPreservingJournal(
  inventory: RuntimeInventoryState,
  storage?: Storage,
): boolean {
  const normalized = normalizeInventory(inventory);

  if (!normalized) return false;

  const target = getStorage(storage);

  if (!target) return false;

  try {
    const raw = target.getItem(RUNTIME_INVENTORY_SAVE_KEY);

    if (raw === null) {
      return writeSnapshot(
        {
          inventory: normalized,
          revision: 0,
          transactions: [],
        },
        target,
      );
    }

    const current = parseSnapshot(raw);

    if (!current) return false;

    return writeSnapshot(
      {
        inventory: normalized,
        revision: current.revision,
        transactions: current.transactions,
      },
      target,
    );
  } catch {
    return false;
  }
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