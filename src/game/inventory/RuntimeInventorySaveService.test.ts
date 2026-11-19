
import { describe, expect, it } from 'vitest';
import {
  RUNTIME_INVENTORY_SAVE_KEY,
  RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION,
  loadRuntimeInventory,
  saveRuntimeInventory,
} from './RuntimeInventorySaveService';
import {
  createRuntimeInventory,
  collectRuntimeResource,
  removeRuntimeResource,
} from './RuntimeInventorySystem';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }

  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe('RuntimeInventorySaveService', () => {
  it('saves a versioned inventory envelope', () => {
    const storage = new MemoryStorage();

    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210'
    );

    expect(collected.ok).toBe(true);

    expect(
      saveRuntimeInventory(
        collected.state,
        storage as unknown as Storage
      )
    ).toBe(true);

    const envelope = JSON.parse(
      storage.getItem(RUNTIME_INVENTORY_SAVE_KEY)!
    );

    expect(envelope.schemaVersion).toBe(
      RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION
    );

    expect(typeof envelope.savedAt).toBe('number');

    expect(
      envelope.inventory.resources['crystal-540-210']
    ).toBe(1);
  });

  it('keeps removed resources removed after reload', () => {
    const storage = new MemoryStorage();

    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210'
    );

    const removed = removeRuntimeResource(
      collected.state,
      'crystal-540-210'
    );

    expect(removed.ok).toBe(true);

    expect(
      saveRuntimeInventory(
        removed.state,
        storage as unknown as Storage
      )
    ).toBe(true);

    const reloadedInventory = loadRuntimeInventory(
      storage as unknown as Storage
    );

    expect(reloadedInventory).not.toBeNull();

    expect(
      reloadedInventory?.resources['crystal-540-210']
    ).toBeUndefined();

    expect(
      Object.keys(reloadedInventory?.resources ?? {})
    ).toEqual([]);
  });

  it('restores resources as a safe null-prototype record', () => {
    const storage = new MemoryStorage();

    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210'
    );

    saveRuntimeInventory(
      collected.state,
      storage as unknown as Storage
    );

    const loaded = loadRuntimeInventory(
      storage as unknown as Storage
    );

    expect(Object.getPrototypeOf(loaded?.resources)).toBe(null);
  });

  it('rejects unsupported schema versions and invalid quantities', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION + 1,
        savedAt: Date.now(),
        inventory: {
          resources: { 'crystal-1': 1 },
        },
      })
    );

    expect(
      loadRuntimeInventory(storage as unknown as Storage)
    ).toBeNull();

    storage.setItem(
      RUNTIME_INVENTORY_SAVE_KEY,
      JSON.stringify({
        schemaVersion: RUNTIME_INVENTORY_SAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        inventory: {
          resources: { 'crystal-1': -1 },
        },
      })
    );

    expect(
      loadRuntimeInventory(storage as unknown as Storage)
    ).toBeNull();
  });

  it('returns null when no save exists and handles storage errors', () => {
    const emptyStorage = new MemoryStorage();

    expect(
      loadRuntimeInventory(emptyStorage as unknown as Storage)
    ).toBeNull();

    const brokenStorage = {
      getItem() {
        throw new Error('Storage unavailable');
      },
    } as unknown as Storage;

    expect(loadRuntimeInventory(brokenStorage)).toBeNull();
  });
});
