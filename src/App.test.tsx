// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import {
  createGameplayState,
  updateGameplayState,
  type GameplayState,
} from './game/state/GameplayState';
import {
  GAMEPLAY_SAVE_KEY,
  loadGameplaySave,
} from './game/state/GameplaySaveService';
import {
  RUNTIME_INVENTORY_SAVE_KEY,
  loadRuntimeInventorySnapshot,
  saveRuntimeInventorySnapshot,
} from './game/inventory/RuntimeInventorySaveService';
import { InventoryTransactionService } from './game/inventory/InventoryTransactionService';

const appHarness = vi.hoisted(() => ({
  onGameplayStateChange:
    null as ((state: GameplayState) => void) | null,
  onCraftingTransaction:
    null as
      | ((transactionId: string, recipeId: string) => { success: boolean })
      | null,
}));

vi.mock('./game/PhaserGame', () => ({
  default: (props: {
    onGameplayStateChange: (state: GameplayState) => void;
  }) => {
    appHarness.onGameplayStateChange = props.onGameplayStateChange;
    return null;
  },
}));

vi.mock('./game/LabPanel', () => ({
  default: () => null,
}));

// Keep the real App callback and transaction service, while replacing only
// the adapter with a deterministic test recipe. Production recipes stay empty.
vi.mock('./game/crafting/CraftingTransactionAdapter', () => ({
  CraftingTransactionAdapter: class {
    constructor(
      private readonly service: InventoryTransactionService,
    ) {}

    execute(
      transactionId: string,
      recipeId: string,
      expectedRevision: number,
    ) {
      if (recipeId === 'fail') {
        return {
          success: false as const,
          error: 'UNKNOWN_RECIPE' as const,
          message: 'Simulated crafting failure.',
        };
      }

      const reaction = {
        id: recipeId,
        inputs: [
          { resourceId: 'crystal-test-input', quantity: 1 },
        ],
        outputs: [
          { resourceId: 'crystal-test-output', quantity: 1 },
        ],
      };

      const prepared = this.service.prepare(
        transactionId,
        reaction,
        expectedRevision,
      );

      if (!prepared.success) {
        return {
          success: false as const,
          error: prepared.error,
          message: prepared.message,
        };
      }

      const committed = this.service.commit(transactionId);

      if (!committed.success) {
        return {
          success: false as const,
          error: committed.error,
          message: committed.message,
        };
      }

      const snapshot = this.service.getSnapshot();

      return {
        success: true as const,
        recipeId,
        produced: {
          resourceId: 'crystal-test-output',
          quantity: 1,
        },
        revision: snapshot.revision,
        inventory: snapshot.inventory.resources,
      };
    }
  },
}));

// This test-only panel exposes the callback passed by App without enabling
// or changing the real player-facing crafting UI.
vi.mock('./game/inventory/RuntimeInventoryPanel', () => ({
  default: (props: {
    inventory: {
      resources: Readonly<Record<string, number>>;
    };
    onCraftingTransaction: (
      transactionId: string,
      recipeId: string,
    ) => { success: boolean };
  }) => {
    appHarness.onCraftingTransaction = props.onCraftingTransaction;

    return createElement(
      'section',
      null,
      createElement(
        'output',
        { 'data-testid': 'inventory-state' },
        JSON.stringify(props.inventory.resources),
      ),
      createElement(
        'button',
        {
          'data-testid': 'craft-success',
          onClick: () =>
            props.onCraftingTransaction(
              'app-sync-success',
              'test-recipe',
            ),
        },
        'Run successful test transaction',
      ),
      createElement(
        'button',
        {
          'data-testid': 'craft-failure',
          onClick: () =>
            props.onCraftingTransaction(
              'app-sync-failure',
              'fail',
            ),
        },
        'Run failed test transaction',
      ),
    );
  },
}));

function mountApp() {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const root = createRoot(host);

  act(() => {
    root.render(createElement(App));
  });

  return {
    root,
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

function emitGameplayState(state: GameplayState) {
  if (!appHarness.onGameplayStateChange) {
    throw new Error('App gameplay callback is not initialized.');
  }

  act(() => {
    appHarness.onGameplayStateChange!(state);
  });
}

function collect(state: GameplayState, id: string): GameplayState {
  return updateGameplayState(state, {
    type: 'COLLECT_RESOURCE',
    id,
  });
}

function openInventory(host: HTMLElement) {
  const inventoryNav = Array.from(
    host.querySelectorAll('button'),
  ).find((button) => button.textContent?.includes('Inventory'));

  if (!inventoryNav) {
    throw new Error('Inventory navigation button was not rendered.');
  }

  act(() => inventoryNav.click());
}describe('App chemistry inventory integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    appHarness.onGameplayStateChange = null;
    appHarness.onCraftingTransaction = null;

    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('migrates legacy gameplay collections into the initial inventory baseline', () => {
    let gameplay = createGameplayState();
    gameplay = collect(gameplay, 'crystal-water-legacy-01');
    gameplay = collect(gameplay, 'crystal-iron-legacy-01');

    const app = mountApp();

    emitGameplayState(gameplay);

    const snapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.inventory.resources).toEqual({
      'crystal-water-legacy-01': 1,
      'crystal-iron-legacy-01': 1,
    });

    // Legacy collections are migration baseline, not new transactions.
    expect(snapshot?.revision).toBe(0);
    expect(snapshot?.transactions).toHaveLength(0);

    expect(loadGameplaySave(window.localStorage)).toEqual(gameplay);

    app.unmount();
  });

  it('journals only collections missing from the durable inventory', () => {
    saveRuntimeInventorySnapshot(
      {
        inventory: {
          resources: {
            'crystal-water-old': 1,
          },
        },
        revision: 4,
        transactions: [],
      },
      window.localStorage,
    );

    let gameplay = createGameplayState();
    gameplay = collect(gameplay, 'crystal-water-old');
    gameplay = collect(gameplay, 'crystal-iron-new');

    const app = mountApp();

    emitGameplayState(gameplay);

    const snapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(snapshot?.inventory.resources).toEqual({
      'crystal-water-old': 1,
      'crystal-iron-new': 1,
    });

    expect(snapshot?.revision).toBe(5);
    expect(snapshot?.transactions).toHaveLength(1);
    expect(snapshot?.transactions[0]).toMatchObject({
      transactionId: 'world-collect-crystal-iron-new',
      reactionId: 'system-world-collection',
      status: 'COMMITTED',
      expectedRevision: 4,
    });

    expect(loadGameplaySave(window.localStorage)).toEqual(gameplay);

    app.unmount();
  });

  it('does not duplicate a committed collection after App reload', () => {
    saveRuntimeInventorySnapshot(
      {
        inventory: {
          resources: {
            'crystal-water-reload': 1,
          },
        },
        revision: 1,
        transactions: [],
      },
      window.localStorage,
    );

    let gameplay = createGameplayState();
    gameplay = collect(gameplay, 'crystal-water-reload');
    gameplay = collect(gameplay, 'crystal-iron-reload');

    const firstApp = mountApp();
    emitGameplayState(gameplay);
    firstApp.unmount();

    const firstSnapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(firstSnapshot?.revision).toBe(2);
    expect(firstSnapshot?.inventory.resources['crystal-iron-reload'])
      .toBe(1);

    const secondApp = mountApp();
    emitGameplayState(gameplay);

    const secondSnapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(secondSnapshot?.revision).toBe(2);
    expect(secondSnapshot?.inventory.resources).toEqual({
      'crystal-water-reload': 1,
      'crystal-iron-reload': 1,
    });
    expect(secondSnapshot?.transactions).toHaveLength(1);

    secondApp.unmount();
  });

  it('does not save gameplay progress when inventory persistence fails', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage',
    );
    const backingStorage = window.localStorage;

    let failInventoryWrites = false;

    const controlledStorage: Storage = {
      get length() {
        return backingStorage.length;
      },
      clear: () => backingStorage.clear(),
      getItem: (key) => backingStorage.getItem(key),
      key: (index) => backingStorage.key(index),
      removeItem: (key) => backingStorage.removeItem(key),
      setItem: (key, value) => {
        if (
          failInventoryWrites &&
          key === RUNTIME_INVENTORY_SAVE_KEY
        ) {
          throw new Error('Simulated inventory storage failure.');
        }

        backingStorage.setItem(key, value);
      },
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: controlledStorage,
    });

    let app: ReturnType<typeof mountApp> | null = null;

    try {
      app = mountApp();

      const initialGameplay = createGameplayState();
      emitGameplayState(initialGameplay);

      expect(loadGameplaySave(controlledStorage)).toEqual(initialGameplay);

      failInventoryWrites = true;

      const nextGameplay = collect(
        initialGameplay,
        'crystal-storage-failure',
      );

      emitGameplayState(nextGameplay);

      expect(loadRuntimeInventorySnapshot(controlledStorage)).toMatchObject({
        inventory: { resources: {} },
        revision: 0,
        transactions: [],
      });

      expect(loadGameplaySave(controlledStorage)).toEqual(initialGameplay);
      expect(controlledStorage.getItem(GAMEPLAY_SAVE_KEY)).not.toBeNull();
    } finally {
      app?.unmount();

      if (originalDescriptor) {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });  it('refreshes React inventory from the transaction service after successful crafting', () => {
    const gameplay = collect(
      createGameplayState(),
      'crystal-test-input',
    );

    const app = mountApp();
    emitGameplayState(gameplay);
    openInventory(app.host);

    const inventoryState = app.host.querySelector(
      '[data-testid="inventory-state"]',
    );
    const craftButton = app.host.querySelector(
      '[data-testid="craft-success"]',
    ) as HTMLButtonElement | null;

    expect(inventoryState?.textContent).toContain(
      '"crystal-test-input":1',
    );
    expect(craftButton).not.toBeNull();

    act(() => craftButton?.click());

    const updatedInventoryState = app.host.querySelector(
      '[data-testid="inventory-state"]',
    );

    expect(updatedInventoryState?.textContent).toContain(
      '"crystal-test-output":1',
    );
    expect(updatedInventoryState?.textContent).not.toContain(
      'crystal-test-input',
    );

    const snapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(snapshot?.inventory.resources).toEqual({
      'crystal-test-output': 1,
    });
    expect(snapshot?.revision).toBe(1);

    app.unmount();
  });

  it('keeps React inventory unchanged when crafting fails', () => {
    const gameplay = collect(
      createGameplayState(),
      'crystal-test-input',
    );

    const app = mountApp();
    emitGameplayState(gameplay);
    openInventory(app.host);

    const before = app.host.querySelector(
      '[data-testid="inventory-state"]',
    )?.textContent;

    const failButton = app.host.querySelector(
      '[data-testid="craft-failure"]',
    ) as HTMLButtonElement | null;

    expect(before).toContain('"crystal-test-input":1');
    expect(failButton).not.toBeNull();

    act(() => failButton?.click());

    const after = app.host.querySelector(
      '[data-testid="inventory-state"]',
    )?.textContent;

    expect(after).toBe(before);

    const snapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(snapshot?.inventory.resources).toEqual({
      'crystal-test-input': 1,
    });
    expect(snapshot?.revision).toBe(0);

    app.unmount();
  });
});