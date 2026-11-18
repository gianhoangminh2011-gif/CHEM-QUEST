
import { describe, expect, it } from 'vitest';
import {
  canCraft,
  craftItem,
  isValidRecipe,
  type CraftingRecipe,
  type CraftingState,
} from './CraftingSystem';

const recipe: CraftingRecipe = {
  id: 'test-recipe',
  outputId: 'test-tool',
  ingredients: [
    { ingredientId: 'ore-a', quantity: 2 },
    { ingredientId: 'ore-b', quantity: 1 },
  ],
};

const state: CraftingState = {
  inventory: [
    { ingredientId: 'ore-a', quantity: 3 },
    { ingredientId: 'ore-b', quantity: 1 },
    { ingredientId: 'unused', quantity: 2 },
  ],
  craftedEquipmentIds: [],
};

describe('CraftingSystem', () => {
  it('accepts a valid recipe', () => {
    expect(isValidRecipe(recipe)).toBe(true);
  });

  it('rejects recipes without ingredients', () => {
    expect(isValidRecipe({ ...recipe, ingredients: [] }).toBe(false);
  });

  it('rejects invalid ingredient quantities', () => {
    expect(
      isValidRecipe({
        ...recipe,
        ingredients: [{ ingredientId: 'ore-a', quantity: 0 }],
      })
    ).toBe(false);

    expect(
      isValidRecipe({
        ...recipe,
        ingredients: [{ ingredientId: 'ore-a', quantity: 1.5 }],
      })
    ).toBe(false);
  });

  it('rejects duplicate ingredient entries', () => {
    expect(
      isValidRecipe({
        ...recipe,
        ingredients: [
          { ingredientId: 'ore-a', quantity: 1 },
          { ingredientId: 'ore-a', quantity: 2 },
        ],
      })
    ).toBe(false);
  });

  it('rejects crafting when materials are insufficient', () => {
    const lowInventory: CraftingState = {
      inventory: [{ ingredientId: 'ore-a', quantity: 1 }],
      craftedEquipmentIds: [],
    };

    expect(canCraft(lowInventory, recipe)).toBe(
      'INSUFFICIENT_INGREDIENTS'
    );

    const result = craftItem(lowInventory, recipe);

    expect(result).toEqual({
      ok: false,
      state: lowInventory,
      error: 'INSUFFICIENT_INGREDIENTS',
    });

    expect(lowInventory.inventory).toEqual([
      { ingredientId: 'ore-a', quantity: 1 },
    ]);
  });

  it('consumes materials and preserves unused materials', () => {
    const result = craftItem(state, recipe);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.outputId).toBe('test-tool');

    expect(result.state.inventory).toEqual([
      { ingredientId: 'ore-a', quantity: 1 },
      { ingredientId: 'unused', quantity: 2 },
    ]);

    expect(result.state.craftedEquipmentIds).toEqual([
      'test-tool',
    ]);

    // Original state remains untouched.
    expect(state.inventory).toHaveLength(3);
  });

  it('blocks duplicate crafting', () => {
    const alreadyCrafted: CraftingState = {
      ...state,
      craftedEquipmentIds: ['test-tool'],
    };

    expect(canCraft(alreadyCrafted, recipe)).toBe(
      'ALREADY_CRAFTED'
    );

    expect(craftItem(alreadyCrafted, recipe)).toEqual({
      ok: false,
      state: alreadyCrafted,
      error: 'ALREADY_CRAFTED',
    });
  });

  it('does not mutate state for an invalid recipe', () => {
    const invalid = { ...recipe, ingredients: [] };
    const result = craftItem(state, invalid);

    expect(result).toEqual({
      ok: false,
      state,
      error: 'INVALID_RECIPE',
    });
  });
});
