
import { describe, expect, it } from 'vitest';
import {
  collectRuntimeResource,
  createRuntimeInventory,
  removeRuntimeResource,
} from './RuntimeInventorySystem';

describe('RuntimeInventorySystem — removeRuntimeResource', () => {
  it('removes exactly the requested quantity when multiple units exist', () => {
    let inventory = createRuntimeInventory();

    for (let i = 0; i < 3; i += 1) {
      const collected = collectRuntimeResource(
        inventory,
        'crystal-540-210',
      );
      expect(collected.ok).toBe(true);
      inventory = collected.state;
    }

    const result = removeRuntimeResource(
      inventory,
      'crystal-540-210',
      1,
    );

    expect(result.ok).toBe(true);
    expect(result.state.resources['crystal-540-210']).toBe(2);
    expect(inventory.resources['crystal-540-210']).toBe(3);
  });

  it('deletes the resource key when the last unit is removed', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210',
    );

    const result = removeRuntimeResource(
      collected.state,
      'crystal-540-210',
      1,
    );

    expect(result.ok).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(
        result.state.resources,
        'crystal-540-210',
      ),
    ).toBe(false);
  });

  it('rejects an invalid resource ID without changing inventory', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210',
    );

    const result = removeRuntimeResource(
      collected.state,
      'invalid-resource',
      1,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_RESOURCE_ID');
    expect(result.state).toBe(collected.state);
    expect(result.state.resources['crystal-540-210']).toBe(1);
  });

  it('rejects zero, negative, fractional, and unsafe quantities', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210',
    );

    for (const quantity of [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const result = removeRuntimeResource(
        collected.state,
        'crystal-540-210',
        quantity,
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_QUANTITY');
      expect(result.state).toBe(collected.state);
    }
  });

  it('rejects removal when the resource does not exist', () => {
    const inventory = createRuntimeInventory();

    const result = removeRuntimeResource(
      inventory,
      'crystal-missing-01',
      1,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_RESOURCE');
    expect(result.state).toBe(inventory);
  });

  it('rejects removal when requested quantity exceeds available quantity', () => {
    const collected = collectRuntimeResource(
      createRuntimeInventory(),
      'crystal-540-210',
    );

    const result = removeRuntimeResource(
      collected.state,
      'crystal-540-210',
      2,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_RESOURCE');
    expect(result.state).toBe(collected.state);
    expect(result.state.resources['crystal-540-210']).toBe(1);
  });
});
