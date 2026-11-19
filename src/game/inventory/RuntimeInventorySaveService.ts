
import type { RuntimeInventoryState } from './RuntimeInventorySystem';

export const RUNTIME_INVENTORY_SAVE_KEY =
  'chem-quest:runtime-inventory-save';

export const RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION = 1;

interface RuntimeInventorySaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  inventory: RuntimeInventoryState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRuntimeInventory(
  value: unknown
): value is RuntimeInventoryState {
  if (!isRecord(value) || !isRecord(value.resources)) {
    return false;
  }

  return Object.entries(value.resources).every(
    ([resourceId, quantity]) =>
      resourceId.startsWith('crystal-') &&
      resourceId.trim() === resourceId &&
      Number.isSafeInteger(quantity) &&
      (quantity as number) > 0
  );
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;

  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeInventory(
  inventory: RuntimeInventoryState
): RuntimeInventoryState {
  const resources = Object.create(null) as Record<string, number>;

  for (const [resourceId, quantity] of Object.entries(inventory.resources)) {
    resources[resourceId] = quantity;
  }

  return { resources };
}

export function saveRuntimeInventory(
  inventory: RuntimeInventoryState,
  storage?: Storage
): boolean {
  const target = getStorage(storage);

  if (!target || !isRuntimeInventory(inventory)) {
    return false;
  }

  const envelope: RuntimeInventorySaveEnvelope = {
    schemaVersion: RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    inventory: normalizeInventory(inventory),
  };

  try {
    target.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify(envelope)
    );
    return true;
  } catch {
    return false;
  }
}

export function loadRuntimeInventory(
  storage?: Storage
): RuntimeInventoryState | null {
  const target = getStorage(storage);
  if (!target) return null;

  try {
    const raw = target.getItem(RUNTIME_INVENTORY_SAVE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION ||
      !isRuntimeInventory(parsed.inventory)
    ) {
      return null;
    }

    return normalizeInventory(parsed.inventory);
  } catch {
    return null;
  }
}

export function clearRuntimeInventorySave(
  storage?: Storage
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
