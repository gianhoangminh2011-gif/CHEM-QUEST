
 // @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

const appHarness = vi.hoisted(() => ({
  onGameplayStateChange:
    null as ((state: GameplayState) => void) | null,
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

describe('App chemistry inventory integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    appHarness.onGameplayStateChange = null;

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
    const app = mountApp();

    const initialGameplay = createGameplayState();
    emitGameplayState(initialGameplay);

    expect(loadGameplaySave(window.localStorage)).toEqual(
      initialGameplay,
    );

    const originalSetItem =
      window.localStorage.setItem.bind(window.localStorage);

    const setItemSpy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation((key: string, value: string) => {
        if (key === RUNTIME_INVENTORY_SAVE_KEY) {
          throw new Error('Simulated inventory storage failure.');
        }

        originalSetItem(key, value);
      });

    const nextGameplay = collect(
      initialGameplay,
      'crystal-storage-failure',
    );

    emitGameplayState(nextGameplay);

    expect(loadRuntimeInventorySnapshot(window.localStorage))
      ?.toMatchObject({
        inventory: { resources: {} },
        revision: 0,
        transactions: [],
      });

    // Gameplay save remains at the last safely synchronized state.
    expect(loadGameplaySave(window.localStorage)).toEqual(
      initialGameplay,
    );

    expect(
      window.localStorage.getItem(GAMEPLAY_SAVE_KEY),
    ).not.toBeNull();

    setItemSpy.mockRestore();
    app.unmount();
  });
});
