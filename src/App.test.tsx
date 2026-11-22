
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
} from './game/inventory/RuntimeInventorySaveService';
import { InventoryTransactionService } from './game/inventory/InventoryTransactionService';

const appHarness = vi.hoisted(() => ({
  onGameplayStateChange:
    null as ((state: GameplayState) => void) | null,

  onCollectResource:
    null as ((resourceId: string) => boolean) | null,

  onCraftingTransaction:
    null as
      | ((transactionId: string, recipeId: string) => { success: boolean })
      | null,

  onRemoveResource:
    null as
      | ((resourceId: string) => {
          success: boolean;
          message?: string;
        })
      | null,
}));

vi.mock('./game/PhaserGame', () => ({
  default: (props: {
    onGameplayStateChange: (state: GameplayState) => void;
    onCollectResource: (resourceId: string) => boolean;
  }) => {
    appHarness.onGameplayStateChange = props.onGameplayStateChange;
    appHarness.onCollectResource = props.onCollectResource;

    return null;
  },
}));

vi.mock('./game/LabPanel', () => ({
  default: () => null,
}));

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

vi.mock('./game/inventory/RuntimeInventoryPanel', () => ({
  default: (props: {
    inventory: {
      resources: Readonly<Record<string, number>>;
    };
    onCraftingTransaction: (
      transactionId: string,
      recipeId: string,
    ) => { success: boolean };
    onRemoveResource: (
      resourceId: string,
    ) => {
      success: boolean;
      message?: string;
    };
  }) => {
    appHarness.onCraftingTransaction = props.onCraftingTransaction;
    appHarness.onRemoveResource = props.onRemoveResource;

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
      createElement(
        'button',
        {
          'data-testid': 'remove-resource',
          onClick: () =>
            props.onRemoveResource('crystal-test-input'),
        },
        'Remove test resource',
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

/**
 * Simulates the real BootScene collection order:
 * 1. Commit inventory transaction.
 * 2. Only if successful, update gameplay state.
 */
function collectThroughApp(
  state: GameplayState,
  resourceId: string,
): {
  accepted: boolean;
  state: GameplayState;
} {
  if (!appHarness.onCollectResource) {
    throw new Error('App collection callback is not initialized.');
  }

  if (!appHarness.onGameplayStateChange) {
    throw new Error('App gameplay callback is not initialized.');
  }

  let accepted = false;
  let nextState = state;

  act(() => {
    accepted = appHarness.onCollectResource!(resourceId);

    if (accepted) {
      nextState = updateGameplayState(state, {
        type: 'COLLECT_RESOURCE',
        id: resourceId,
      });

      appHarness.onGameplayStateChange!(nextState);
    }
  });

  return {
    accepted,
    state: nextState,
  };
}

function openInventory(host: HTMLElement) {
  const inventoryNav = Array.from(
    host.querySelectorAll('button'),
  ).find((button) => button.textContent?.includes('Inventory'));

  if (!inventoryNav) {
    throw new Error('Inventory navigation button was not rendered.');
  }

  act(() => inventoryNav.click());
}

function createControlledStorage(
  backingStorage: Storage,
  shouldFail: () => boolean,
): Storage {
  return {
    get length() {
      return backingStorage.length;
    },
    clear: () => backingStorage.clear(),
    getItem: (key) => backingStorage.getItem(key),
    key: (index) => backingStorage.key(index),
    removeItem: (key) => backingStorage.removeItem(key),
    setItem: (key, value) => {
      if (
        shouldFail() &&
        key === RUNTIME_INVENTORY_SAVE_KEY
      ) {
        throw new Error('Simulated inventory storage failure.');
      }

      backingStorage.setItem(key, value);
    },
  };
}

describe('App quest and inventory integration', () => {
  beforeEach(() => {
    window.localStorage.clear();

    appHarness.onGameplayStateChange = null;
    appHarness.onCollectResource = null;
    appHarness.onCraftingTransaction = null;
    appHarness.onRemoveResource = null;

    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('migrates legacy gameplay collections into the initial inventory baseline', () => {
    let gameplay = createGameplayState();

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-water-legacy-01',
    });

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-iron-legacy-01',
    });

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

    expect(snapshot?.revision).toBe(0);
    expect(snapshot?.transactions).toHaveLength(0);

    expect(loadGameplaySave(window.localStorage)).toEqual(gameplay);

    app.unmount();
  });

  it('commits inventory before updating gameplay progress', () => {
    const initialGameplay = createGameplayState();
    const app = mountApp();

    emitGameplayState(initialGameplay);

    const result = collectThroughApp(
      initialGameplay,
      'crystal-water-new',
    );

    expect(result.accepted).toBe(true);

    expect(result.state.collectedResourceIds).toContain(
      'crystal-water-new',
    );

    const snapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(snapshot?.inventory.resources).toEqual({
      'crystal-water-new': 1,
    });

    expect(snapshot?.revision).toBe(1);
    expect(snapshot?.transactions).toHaveLength(1);

    expect(snapshot?.transactions[0]).toMatchObject({
      transactionId: 'world-collect-crystal-water-new',
      reactionId: 'system-world-collection',
      status: 'COMMITTED',
      expectedRevision: 0,
    });

    expect(loadGameplaySave(window.localStorage)).toEqual(
      result.state,
    );

    app.unmount();
  });

  it('does not duplicate a collection after App reload', () => {
    const initialGameplay = createGameplayState();
    const firstApp = mountApp();

    emitGameplayState(initialGameplay);

    const firstResult = collectThroughApp(
      initialGameplay,
      'crystal-water-reload',
    );

    expect(firstResult.accepted).toBe(true);

    const firstSnapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(firstSnapshot?.revision).toBe(1);

    firstApp.unmount();

    const secondApp = mountApp();

    // The saved gameplay state is restored before the second App hydrates.
    emitGameplayState(firstResult.state);

    const secondSnapshot = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(secondSnapshot?.revision).toBe(1);

    expect(secondSnapshot?.inventory.resources).toEqual({
      'crystal-water-reload': 1,
    });

    expect(secondSnapshot?.transactions).toHaveLength(1);

    secondApp.unmount();
  });

  it('does not update gameplay progress when inventory persistence fails', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage',
    );

    const backingStorage = window.localStorage;

    let failInventoryWrites = false;

    const controlledStorage = createControlledStorage(
      backingStorage,
      () => failInventoryWrites,
    );

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: controlledStorage,
    });

    let app: ReturnType<typeof mountApp> | null = null;

    try {
      const initialGameplay = createGameplayState();

      app = mountApp();
      emitGameplayState(initialGameplay);

      expect(loadGameplaySave(controlledStorage)).toEqual(
        initialGameplay,
      );

      failInventoryWrites = true;

      const result = collectThroughApp(
        initialGameplay,
        'crystal-storage-failure',
      );

      // BootScene must not update gameplay after a failed collection.
      expect(result.accepted).toBe(false);
      expect(result.state).toEqual(initialGameplay);

      expect(
        result.state.collectedResourceIds,
      ).not.toContain('crystal-storage-failure');

      expect(
        loadRuntimeInventorySnapshot(controlledStorage),
      ).toMatchObject({
        inventory: { resources: {} },
        revision: 0,
        transactions: [],
      });

      expect(loadGameplaySave(controlledStorage)).toEqual(
        initialGameplay,
      );

      expect(
        controlledStorage.getItem(GAMEPLAY_SAVE_KEY),
      ).not.toBeNull();
    } finally {
      app?.unmount();

      if (originalDescriptor) {
        Object.defineProperty(
          window,
          'localStorage',
          originalDescriptor,
        );
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });

  it('refreshes React inventory after successful crafting', () => {
    let gameplay = createGameplayState();

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-test-input',
    });

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
    let gameplay = createGameplayState();

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-test-input',
    });

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

  it('removes one resource durably and does not restore it after reload', () => {
    let gameplay = createGameplayState();

    gameplay = updateGameplayState(gameplay, {
      type: 'COLLECT_RESOURCE',
      id: 'crystal-test-input',
    });

    const firstApp = mountApp();

    emitGameplayState(gameplay);
    openInventory(firstApp.host);

    const before = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(
      before?.inventory.resources['crystal-test-input'],
    ).toBe(1);

    const removeButton = firstApp.host.querySelector(
      '[data-testid="remove-resource"]',
    ) as HTMLButtonElement | null;

    expect(removeButton).not.toBeNull();

    act(() => removeButton?.click());

    const after = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(after?.inventory.resources).toEqual({});
    expect(after?.revision).toBe(1);
    expect(after?.transactions).toHaveLength(1);

    expect(after?.transactions[0]).toMatchObject({
      reactionId: 'system-inventory-remove',
      status: 'COMMITTED',
      expectedRevision: 0,
    });

    // Inventory removal must not erase quest collection history.
    expect(loadGameplaySave(window.localStorage)).toEqual(gameplay);

    firstApp.unmount();

    const secondApp = mountApp();

    emitGameplayState(gameplay);
    openInventory(secondApp.host);

    const reloaded = loadRuntimeInventorySnapshot(
      window.localStorage,
    );

    expect(reloaded?.inventory.resources).toEqual({});
    expect(reloaded?.revision).toBe(1);

    expect(
      secondApp.host.querySelector(
        '[data-testid="inventory-state"]',
      )?.textContent,
    ).toContain('{}');

    secondApp.unmount();
  });

  it('keeps React and durable inventory unchanged when removal persistence fails', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage',
    );

    const backingStorage = window.localStorage;

    let failInventoryWrites = false;

    const controlledStorage = createControlledStorage(
      backingStorage,
      () => failInventoryWrites,
    );

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: controlledStorage,
    });

    let app: ReturnType<typeof mountApp> | null = null;

    try {
      let gameplay = createGameplayState();

      gameplay = updateGameplayState(gameplay, {
        type: 'COLLECT_RESOURCE',
        id: 'crystal-test-input',
      });

      app = mountApp();

      emitGameplayState(gameplay);
      openInventory(app.host);

      const beforeUI = app.host.querySelector(
        '[data-testid="inventory-state"]',
      )?.textContent;

      const beforeSnapshot = loadRuntimeInventorySnapshot(
        controlledStorage,
      );

      expect(beforeSnapshot?.inventory.resources).toEqual({
        'crystal-test-input': 1,
      });

      failInventoryWrites = true;

      const removeButton = app.host.querySelector(
        '[data-testid="remove-resource"]',
      ) as HTMLButtonElement | null;

      expect(removeButton).not.toBeNull();

      act(() => removeButton?.click());

      const afterUI = app.host.querySelector(
        '[data-testid="inventory-state"]',
      )?.textContent;

      const afterSnapshot = loadRuntimeInventorySnapshot(
        controlledStorage,
      );

      expect(afterUI).toBe(beforeUI);

      expect(afterSnapshot?.inventory.resources).toEqual({
        'crystal-test-input': 1,
      });

      expect(afterSnapshot?.revision).toBe(0);

      expect(loadGameplaySave(controlledStorage)).toEqual(
        gameplay,
      );
    } finally {
      app?.unmount();

      if (originalDescriptor) {
        Object.defineProperty(
          window,
          'localStorage',
          originalDescriptor,
        );
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });
});
