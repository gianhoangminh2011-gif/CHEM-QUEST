
import { describe, expect, it } from 'vitest';
import {
  createInventoryState,
  collectResource,
  removeResource,
  craftFromInventory,
} from './InventorySystem';
import type { InventoryState } from './InventorySystem';
import type { CraftingRecipe } from '../crafting/CraftingSystem';

const makeRecipe = (
  overrides: Partial<CraftingRecipe> = {},
): CraftingRecipe => ({
  id: 'test_recipe',
  ingredients: [
    { resourceId: 'test_a', quantity: 2 },
    { resourceId: 'test_b', quantity: 1 },
  ],
  output: { resourceId: 'test_out', quantity: 1 },
  ...overrides,
});

const makeRegistry = (recipe: CraftingRecipe) => ({
  [recipe.id]: recipe,
});

describe('InventorySystem', () => {
  describe('createInventoryState', () => {
    it('starts with an empty inventory', () => {
      const state = createInventoryState();

      expect(state.resources).toEqual({});
      expect(state.craftedRecipeIds).toEqual([]);
    });

    it('creates independent inventory instances', () => {
      const a = createInventoryState();
      const b = createInventoryState();

      expect(a.resources).not.toBe(b.resources);
      expect(a.craftedRecipeIds).not.toBe(b.craftedRecipeIds);
    });
  });

  describe('collectResource', () => {
    it('collects one resource by default', () => {
      const state = createInventoryState();
      const result = collectResource(state, 'test_a');

      expect(result.ok).toBe(true);
      expect(result.state.resources).toEqual({ test_a: 1 });
    });

    it('collects a specified quantity', () => {
      const result = collectResource(
        createInventoryState(),
        'test_a',
        5,
      );

      expect(result.state.resources).toEqual({ test_a: 5 });
    });

    it('stacks existing resources', () => {
      const first = collectResource(
        createInventoryState(),
        'test_a',
          2,
      );

      const second = collectResource(
        first.state,
        'test_a',
        3,
      );

      expect(second.state.resources).toEqual({ test_a: 5 });
    });

    it('rejects empty resource IDs', () => {
      const state = createInventoryState();

      for (const id of ['', ' ', '  ', ' test_a', 'test_a ']) {
        const result = collectResource(state, id);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('INVALID_RESOURCE_ID');
        expect(result.state).toBe(state);
      }
    });

    it.each([
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ])('rejects invalid collection quantity %s', (quantity) => {
      const state = createInventoryState();
      const result = collectResource(state, 'test_a', quantity);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_QUANTITY');
      expect(result.state).toBe(state);
    });

    it('rejects quantity overflow', () => {
      const state: InventoryState = {
        resources: { test_a: Number.MAX_SAFE_INTEGER },
        craftedRecipeIds: [],
      };

      const result = collectResource(state, 'test_a');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_QUANTITY');
      expect(result.state).toBe(state);
    });

    it('does not mutate the original state', () => {
      const original = createInventoryState();
      const result = collectResource(original, 'test_a', 2);

      expect(original.resources).toEqual({});
      expect(result.state.resources).toEqual({ test_a: 2 });
      expect(result.state).not.toBe(original);
    });

    it('handles prototype-like resource IDs safely', () => {
      const state = createInventoryState();
      const result = collectResource(state, '__proto__", 2);

      expect(result.ok).toBe(true);
      expect(result.state.resources['__proto__']).toBe(2);
    });
  });

  describe('removeResource', () => {
    it('removes a specified quantity', () => {
      const collected = collectResource(
        createInventoryState(),
        'test_a',
        5,
      );

      const result = removeResource(
        collected.state,
        'test_a',
        2,
      );

      expect(result.ok).toBe(true);
      expect(result.state.resources).toEqual({ test_a: 3 });
    });

    it('removes resource key when quantity reaches zero', () => {
      const collected = collectResource(
        createInventoryState(),
        'test_a',
        2,
      );

      const result = removeResource(
        collected.state,
        'test_a',
        2,
      );

      expect(result.ok).toBe(true);
      expect(result.state.resources).toEqual({});
    });

    it('rejects removal of missing resource', () => {
      const state = createInventoryState();
      const result = removeResource(state, 'test_a', 1);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_RESOURCE');
      expect(result.state).toBe(state);
    });

    it('rejects removal exceeding available quantity', () => {
      const collected = collectResource(
        createInventoryState(),
        'test_a',
        2,
      );

      const result = removeResource(
        collected.state,
        'test_a',
        3,
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_RESOURCE');
      expect(result.state).toBe(collected.state);
    });

    it('rejects invalid IDs', () => {
      const state = createInventoryState();

      const result = removeResource(state, '  ', 1);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_RESOURCE_ID');
      expect(result.state).toBe(state);
    });

    it.each([
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ])('rejects invalid removal quantity %s', (quantity) => {
      const state = createInventoryState();
      const result = removeResource(state, 'test_a', quantity);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_QUANTITY');
      expect(result.state).toBe(state);
    });

    it('does not mutate the original inventory', () => {
      const original = collectResource(
        createInventoryState(),
        'test_a',
        5,
      ).state;

      const result = removeResource(original, 'test_a', 2);

      expect(original.resources).toEqual({ test_a: 5 });
      expect(result.state.resources).toEqual({ test_a: 3 });
    });
  });

  describe('craftFromInventory', () => {
    it('delegates crafting to CraftingSystem', () => {
      const state = createInventoryState();
      const recipe = makeRecipe();

      const result = craftFromInventory(
        state,
        recipe.id,
        makeRegistry(recipe),
      );

      expect(result.result).toMatchObject({
        ok: false,
        error: 'INSUFFICIENT_INGREDIENTS',
      });

      expect(result.state).toBe(state);
    });

    it('successfully crafts and consumes ingredients', () => {
      const state: InventoryState = {
        resources: {
          test_a: 4,
          test_b: 2,
          test_unused: 5,
        },
        craftedRecipeIds: [],
      };

      const recipe = makeRecipe();

      const result = craftFromInventory(
        state,
        recipe.id,
        makeRegistry(recipe),
      );

      expect(result.result.ok).toBe(true);
      expect(result.state.resources).toEqual({
        test_a: 2,
        test_b: 1,
        test_unused: 5,
        test_out: 1,
      });
    });

    it('preserves original inventory on crafting failure', () => {
      const state: InventoryState = {
        resources: { test_a: 1 },
        craftedRecipeIds: [],
      };

      const recipe = makeRecipe();

      const result = craftFromInventory(
        state,
        recipe.id,
        makeRegistry(recipe),
      );

      expect(result.result.ok).toBe(false);
      expect(result.state).toBe(state);
      expect(state.resources).toEqual({ test_a: 1 });
    });

    it('supports oneShot recipe tracking', () => {
      const recipe = makeRecipe({ oneShot: true });

      const state: InventoryState = {
        resources: { test_a: 4, test_b: 2 },
        craftedRecipeIds: [],
      };

      const first = craftFromInventory(
        state,
        recipe.id,
        makeRegistry(recipe),
      );

      expect(first.result.ok).toBe(true);
      expect(first.state.craftedRecipeIds).toEqual([
        'test_recipe',
      ]);

      const second = craftFromInventory(
        first.state,
        recipe.id,
        makeRegistry(recipe),
      );

      expect(second.result).toMatchObject({
        ok: false,
        error: 'ALREADY_CRAFTED',
      });
    });

    it('rejects unknown recipes', () => {
      const state = createInventoryState();

      const result = craftFromInventory(
        state,
        'unknown_recipe',
        {},
      );

      expect(result.result).toMatchObject({
        ok: false,
        error: 'UNKNOWN_RECIPE',
      });

      expect(result.state).toBe(state);
    });
  });
});
