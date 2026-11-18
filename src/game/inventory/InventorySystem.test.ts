import { describe, expect, it } from 'vitest';
import {
  createInventoryState,
  collectResource,
  removeResource,
  craftFromInventory,
} from './InventorySystem';
import type { InventoryState } from './InventorySystem';
import type { CraftingRecipe, RecipeRegistry } from '../crafting/CraftingSystem';

const makeRecipe = (over: Partial<CraftingRecipe> = {}): CraftingRecipe => ({
  id: 'test_recipe',
  ingredients: [
    { resourceId: 'test_a', quantity: 2 },
    { resourceId: 'test_b', quantity: 1 },
  ],
  output: { resourceId: 'test_out', quantity: 1 },
  ...over,
});

const makeRegistry = (recipe: CraftingRecipe): RecipeRegistry => ({
  [recipe.id]: recipe,
});

const makeState = (
  resources: Record<string, number>,
  craftedRecipeIds: string[] = [],
): InventoryState => ({
  resources,
  craftedRecipeIds,
});

describe('createInventoryState', () => {
  it('creates an empty inventory', () => {
    const state = createInventoryState();

    expect(Object.keys(state.resources)).toEqual([]);
    expect(state.craftedRecipeIds).toEqual([]);
  });

  it('creates independent states', () => {
    const a = createInventoryState();
    const b = createInventoryState();

    const result = collectResource(a, 'test_a', 2);

    expect(result.ok).toBe(true);
    expect(b.resources).toEqual({});
  });
});

describe('collectResource', () => {
  it('collects a resource', () => {
    const state = createInventoryState();
    const result = collectResource(state, 'test_a', 3);

    expect(result.ok).toBe(true);
    expect(result.state.resources.test_a).toBe(3);
  });

  it('defaults quantity to one', () => {
    const result = collectResource(createInventoryState(), 'test_a');

    expect(result.ok).toBe(true);
    expect(result.state.resources.test_a).toBe(1);
  });

  it('stacks resources', () => {
    const state = makeState({ test_a: 2 });
    const result = collectResource(state, 'test_a', 3);

    expect(result.ok).toBe(true);
    expect(result.state.resources.test_a).toBe(5);
  });

  it('rejects empty or non-canonical IDs', () => {
    for (const id of ['', ' ', ' test_a', 'test_a ']) {
      const result = collectResource(createInventoryState(), id);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_RESOURCE_ID');
    }
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid quantity %s',
    (quantity) => {
      const result = collectResource(
        createInventoryState(),
        'test_a',
        quantity,
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_QUANTITY');
    },
  );

  it('rejects quantity overflow', () => {
    const state = makeState({ test_a: Number.MAX_SAFE_INTEGER });
    const result = collectResource(state, 'test_a', 1);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_QUANTITY');
    expect(result.state).toBe(state);
  });

  it('preserves the original state on success', () => {
    const state = makeState({ test_a: 2 });
    const result = collectResource(state, 'test_a', 3);

    expect(state.resources.test_a).toBe(2);
    expect(result.state.resources.test_a).toBe(5);
    expect(result.state).not.toBe(state);
  });

  it('handles "__proto__" as a resource ID safely', () => {
    const state = createInventoryState();
    const result = collectResource(state, '__proto__', 2);

    expect(result.ok).toBe(true);
    expect(Object.hasOwn(result.state.resources, '__proto__')).toBe(true);
    expect(result.state.resources['__proto__']).toBe(2);
    expect(Object.getPrototypeOf(result.state.resources)).toBeNull();
  });

  it('rejects invalid inventory state', () => {
    const state = makeState({ test_a: -2 });
    const result = collectResource(state, 'test_b', 1);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_INVENTORY');
    expect(result.state).toBe(state);
  });
});

describe('removeResource', () => {
  it('removes an available quantity', () => {
    const state = makeState({ test_a: 5 });
    const result = removeResource(state, 'test_a', 2);

    expect(result.ok).toBe(true);
    expect(result.state.resources.test_a).toBe(3);
  });

  it('removes the key when quantity reaches zero', () => {
    const state = makeState({ test_a: 2 });
    const result = removeResource(state, 'test_a', 2);

    expect(result.ok).toBe(true);
    expect(Object.hasOwn(result.state.resources, 'test_a')).toBe(false);
  });

  it('rejects missing resources', () => {
    const state = createInventoryState();
    const result = removeResource(state, 'test_a', 1);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_RESOURCE');
  });

  it('rejects insufficient quantity atomically', () => {
    const state = makeState({ test_a: 1 });
    const result = removeResource(state, 'test_a', 2);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state.resources.test_a).toBe(1);
  });

  it('rejects invalid quantity', () => {
    const result = removeResource(createInventoryState(), 'test_a', 0);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_QUANTITY');
  });

  it('preserves original inventory on success', () => {
    const state = makeState({ test_a: 5 });
    const result = removeResource(state, 'test_a', 2);

    expect(state.resources.test_a).toBe(5);
    expect(result.state.resources.test_a).toBe(3);
  });
});

describe('craftFromInventory', () => {
  it('delegates to CraftingSystem', () => {
    const state = makeState({ test_a: 2, test_b: 1 });
    const recipe = makeRecipe();
    const result = craftFromInventory(
      state,
      recipe.id,
      makeRegistry(recipe),
    );

    expect(result.result.ok).toBe(true);
  });

  it('consumes ingredients and adds output', () => {
    const state = makeState({ test_a: 4, test_b: 2 });
    const recipe = makeRecipe();
    const result = craftFromInventory(
      state,
      recipe.id,
      makeRegistry(recipe),
    );

    expect(result.result.ok).toBe(true);
    expect(result.state.resources.test_a).toBe(2);
    expect(result.state.resources.test_b).toBe(1);
    expect(result.state.resources.test_out).toBe(1);
  });

  it('does not mutate original state when crafting succeeds', () => {
    const state = makeState({ test_a: 4, test_b: 2 });
    const recipe = makeRecipe();
    const result = craftFromInventory(
      state,
      recipe.id,
      makeRegistry(recipe),
    );

    expect(state.resources.test_a).toBe(4);
    expect(state.resources.test_b).toBe(2);
    expect(result.state).not.toBe(state);
  });

  it('fails atomically when ingredients are insufficient', () => {
    const state = makeState({ test_a: 1 });
    const recipe = makeRecipe();
    const result = craftFromInventory(
      state,
      recipe.id,
      makeRegistry(recipe),
    );

    expect(result.result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state.resources.test_a).toBe(1);
  });

  it('tracks one-shot recipes', () => {
    const state = makeState({ test_a: 4, test_b: 2 });
    const recipe = makeRecipe({ oneShot: true });
    const result = craftFromInventory(
      state,
      recipe.id,
      makeRegistry(recipe),
    );

    expect(result.result.ok).toBe(true);
    expect(result.state.craftedRecipeIds).toContain(recipe.id);
  });

  it('rejects unknown recipes', () => {
    const result = craftFromInventory(
      createInventoryState(),
      'missing_recipe',
      {},
    );

    expect(result.result.ok).toBe(false);
  });
});