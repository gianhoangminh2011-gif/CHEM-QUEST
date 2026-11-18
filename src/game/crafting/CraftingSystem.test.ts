import { describe, expect, it } from 'vitest';
import {
  canCraft,
  craftItem,
  isValidRecipe,
  type CraftingRecipe,
  type CraftingState,
} from './CraftingSystem';

const recipe: CraftingRecipe = {
  id: 'recipe-basic-tool',
  outputId: 'basic-tool',
  ingredients: [
    { ingredientId: 'iron-ore', quantity: 2 },
    { ingredientId: 'crystal', quantity: 1 },
  ],
};

const initialState: CraftingState = {
  inventory: [
    { ingredientId: 'iron-ore', quantity: 5 },
    { ingredientId: 'crystal', quantity: 2 },
    { ingredientId: 'wood', quantity: 3 },
  ],
  craftedEquipmentIds: [],
};

describe('CraftingSystem', () => {
  describe('isValidRecipe', () => {
    it('accepts a valid recipe', () => {
      expect(isValidRecipe(recipe)).toBe(true);
    });

    it('rejects a recipe with no ingredients', () => {
      expect(
        isValidRecipe({ ...recipe, ingredients: [] })
      ).toBe(false);
    });

    it('rejects zero quantity', () => {
      expect(
        isValidRecipe({
          ...recipe,
          ingredients: [
            { ingredientId: 'iron-ore', quantity: 0 },
          ],
        })
      ).toBe(false);
    });

    it('rejects negative quantity', () => {
      expect(
        isValidRecipe({
          ...recipe,
          ingredients: [
            { ingredientId: 'iron-ore', quantity: -1 },
          ],
        })
      ).toBe(false);
    });

    it('rejects fractional quantity', () => {
      expect(
        isValidRecipe({
          ...recipe,
          ingredients: [
            { ingredientId: 'iron-ore', quantity: 1.5 },
          ],
        })
      ).toBe(false);
    });

    it('rejects duplicate ingredient IDs', () => {
      expect(
        isValidRecipe({
          ...recipe,
          ingredients: [
            { ingredientId: 'iron-ore', quantity: 1 },
            { ingredientId: 'iron-ore', quantity: 2 },
          ],
        })
      ).toBe(false);
    });

    it('rejects empty ingredient IDs', () => {
      expect(
        isValidRecipe({
          ...recipe,
          ingredients: [
            { ingredientId: '', quantity: 1 },
          ],
        })
      ).toBe(false);
    });

    it('rejects empty recipe ID', () => {
      expect(
        isValidRecipe({ ...recipe, id: '' })
      ).toBe(false);
    });

    it('rejects empty output ID', () => {
      expect(
        isValidRecipe({ ...recipe, outputId: '' })
      ).toBe(false);
    });
  });

  describe('canCraft', () => {
    it('allows crafting when ingredients are available', () => {
      expect(canCraft(initialState, recipe)).toBeNull();
    });

    it('rejects crafting when ingredients are insufficient', () => {
      const state: CraftingState = {
        inventory: [
          { ingredientId: 'iron-ore', quantity: 1 },
          { ingredientId: 'crystal', quantity: 1 },
        ],
        craftedEquipmentIds: [],
      };

      expect(canCraft(state, recipe)).toBe(
        'INSUFFICIENT_INGREDIENTS'
      );
    });

    it('rejects crafting an already crafted output', () => {
      const state: CraftingState = {
        ...initialState,
        craftedEquipmentIds: ['basic-tool'],
      };

      expect(canCraft(state, recipe)).toBe('ALREADY_CRAFTED');
    });

    it('rejects invalid recipe', () => {
      const invalidRecipe: CraftingRecipe = {
        ...recipe,
        ingredients: [],
      };

      expect(canCraft(initialState, invalidRecipe)).toBe(
        'INVALID_RECIPE'
      );
    });
  });

  describe('craftItem', () => {
    it('consumes required ingredients', () => {
      const result = craftItem(initialState, recipe);

      expect(result.ok).toBe(true);

      if (!result.ok) return;

      expect(result.state.inventory).toEqual([
        { ingredientId: 'iron-ore', quantity: 3 },
        { ingredientId: 'crystal', quantity: 1 },
        { ingredientId: 'wood', quantity: 3 },
      ]);
    });

    it('adds crafted output', () => {
      const result = craftItem(initialState, recipe);

      expect(result.ok).toBe(true);

      if (!result.ok) return;

      expect(result.outputId).toBe('basic-tool');
      expect(result.state.craftedEquipmentIds).toContain(
        'basic-tool'
      );
    });

    it('preserves unused materials', () => {
      const result = craftItem(initialState, recipe);

      expect(result.ok).toBe(true);

      if (!result.ok) return;

      expect(
        result.state.inventory.find(
          (item) => item.ingredientId === 'wood'
        )?.quantity
      ).toBe(3);
    });

    it('does not mutate original state', () => {
      const originalInventory = structuredClone(
        initialState.inventory
      );

      craftItem(initialState, recipe);

      expect(initialState.inventory).toEqual(originalInventory);
      expect(initialState.craftedEquipmentIds).toEqual([]);
    });

    it('does not consume materials on failure', () => {
      const poorState: CraftingState = {
        inventory: [
          { ingredientId: 'iron-ore', quantity: 1 },
          { ingredientId: 'crystal', quantity: 0 },
        ],
        craftedEquipmentIds: [],
      };

      const result = craftItem(poorState, recipe);

      expect(result.ok).toBe(false);
      expect(poorState.inventory).toEqual([
        { ingredientId: 'iron-ore', quantity: 1 },
        { ingredientId: 'crystal', quantity: 0 },
      ]);
    });

    it('prevents duplicate crafting', () => {
      const firstResult = craftItem(initialState, recipe);

      expect(firstResult.ok).toBe(true);

      if (!firstResult.ok) return;

      const secondResult = craftItem(
        firstResult.state,
        recipe
      );

      expect(secondResult.ok).toBe(false);

      if (secondResult.ok) return;

      expect(secondResult.error).toBe('ALREADY_CRAFTED');
    });

    it('returns error for invalid recipe', () => {
      const invalidRecipe: CraftingRecipe = {
        ...recipe,
        ingredients: [],
      };

      const result = craftItem(initialState, invalidRecipe);

      expect(result.ok).toBe(false);

      if (result.ok) return;

      expect(result.error).toBe('INVALID_RECIPE');
    });
  });
});