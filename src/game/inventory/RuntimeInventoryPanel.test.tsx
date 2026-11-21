// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RuntimeInventoryPanel from './RuntimeInventoryPanel';
import {
  collectRuntimeResource,
  createRuntimeInventory,
  removeRuntimeResource,
} from './RuntimeInventorySystem';

describe('RuntimeInventoryPanel — Remove 1', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('removes one unit per click and hides the resource after the last unit', () => {
    let inventory = createRuntimeInventory();

    for (let i = 0; i < 2; i += 1) {
      const result = collectRuntimeResource(
        inventory,
        'crystal-540-210',
      );

      expect(result.ok).toBe(true);
      inventory = result.state;
    }

    const onRemoveResource = vi.fn(() => ({
      success: true,
      message: 'Removed 1 resource.',
    }));

    const host = document.createElement('div');
    document.body.appendChild(host);

    const root = createRoot(host);

    cleanup = () => {
      act(() => root.unmount());
      host.remove();
    };

    const render = () => {
      act(() => {
        root.render(
          createElement(RuntimeInventoryPanel, {
            inventory,
            elements: [],
            researchSamples: [],
            onCraftingTransaction: () => ({
              success: false,
              error: 'UNKNOWN_RECIPE',
              message: 'No recipe.',
            }),
            onRemoveResource,
          }),
        );
      });
    };

    const getRemoveButton = () =>
      Array.from(host.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === 'Remove 1',
      );

    render();

    expect(host.textContent).toContain('Quantity: 2');

    const firstButton = getRemoveButton();
    expect(firstButton).toBeDefined();

    act(() => firstButton?.click());

    expect(onRemoveResource).toHaveBeenNthCalledWith(
      1,
      'crystal-540-210',
    );

    const firstRemoval = removeRuntimeResource(
      inventory,
      'crystal-540-210',
      1,
    );

    expect(firstRemoval.ok).toBe(true);
    inventory = firstRemoval.state;
    render();

    expect(host.textContent).toContain('Quantity: 1');

    const secondButton = getRemoveButton();
    expect(secondButton).toBeDefined();

    act(() => secondButton?.click());

    expect(onRemoveResource).toHaveBeenNthCalledWith(
      2,
      'crystal-540-210',
    );

    const secondRemoval = removeRuntimeResource(
      inventory,
      'crystal-540-210',
      1,
    );

    expect(secondRemoval.ok).toBe(true);
    inventory = secondRemoval.state;
    render();

    expect(host.textContent).toContain('Your inventory is empty.');
    expect(getRemoveButton()).toBeUndefined();
    expect(onRemoveResource).toHaveBeenCalledTimes(2);
  });

  it('shows failure feedback without changing the displayed quantity', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210',
    );

    expect(collected.ok).toBe(true);

    const onRemoveResource = vi.fn(() => ({
      success: false,
      message: 'Simulated persistence failure.',
    }));

    const host = document.createElement('div');
    document.body.appendChild(host);

    const root = createRoot(host);

    cleanup = () => {
      act(() => root.unmount());
      host.remove();
    };

    act(() => {
      root.render(
        createElement(RuntimeInventoryPanel, {
          inventory: collected.state,
          elements: [],
          researchSamples: [],
          onCraftingTransaction: () => ({
            success: false,
            error: 'UNKNOWN_RECIPE',
            message: 'No recipe.',
          }),
          onRemoveResource,
        }),
      );
    });

    const button = Array.from(
      host.querySelectorAll('button'),
    ).find((item) => item.textContent?.trim() === 'Remove 1');

    expect(button).toBeDefined();

    act(() => button?.click());

    expect(onRemoveResource).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Quantity: 1');
    expect(host.textContent).toContain(
      'Simulated persistence failure.',
    );
  });
});