
 // @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PhaserGame from './PhaserGame';
import {
  createGameplayState,
  updateGameplayState,
} from './state/GameplayState';

const phaserMock = vi.hoisted(() => ({
  instances: [] as Array<{
    config: any;
    destroyCalls: number;
    destroyRemoveCanvas?: boolean;
  }>,
}));

vi.mock('phaser', () => {
  class MockGame {
    config: any;
    destroyCalls = 0;
    destroyRemoveCanvas?: boolean;

    constructor(config: any) {
      this.config = config;
      phaserMock.instances.push(this);
    }

    destroy(removeCanvas?: boolean) {
      this.destroyCalls += 1;
      this.destroyRemoveCanvas = removeCanvas;
    }
  }

  return {
    default: {
      Game: MockGame,
      AUTO: 'AUTO',
      Scale: {
        FIT: 'FIT',
        CENTER_BOTH: 'CENTER_BOTH',
      },
    },
  };
});

vi.mock('./scenes/BootScene', () => ({
  default: class MockBootScene {},
}));

describe('PhaserGame React integration', () => {
  beforeEach(() => {
    phaserMock.instances.length = 0;

    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('creates Phaser, receives gameplay updates, and cleans up on unmount', async () => {
    const onGameplayStateChange = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);

    const root = createRoot(host);

    await act(async () => {
      root.render(
        createElement(PhaserGame, {
          onGameplayStateChange,
        })
      );
    });

    expect(phaserMock.instances).toHaveLength(1);

    const game = phaserMock.instances[0];

    expect(game.config.type).toBe('AUTO');
    expect(game.config.width).toBe(960);
    expect(game.config.height).toBe(600);
    expect(game.config.parent).toBe(
      host.querySelector('.phaser-game')
    );

    let state = createGameplayState();

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'integration-crystal-1',
    });

    expect(onGameplayStateChange).toHaveBeenCalledTimes(1);
    expect(onGameplayStateChange).toHaveBeenCalledWith(state);

    await act(async () => {
      root.unmount();
    });

    expect(game.destroyCalls).toBe(1);
    expect(game.destroyRemoveCanvas).toBe(true);

    state = updateGameplayState(state, {
      type: 'COLLECT_RESOURCE',
      id: 'integration-crystal-2',
    });

    expect(onGameplayStateChange).toHaveBeenCalledTimes(1);

    host.remove();
  });
});
