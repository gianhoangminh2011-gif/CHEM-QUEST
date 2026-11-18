
export interface CraftingIngredient {
  ingredientId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  outputId: string;
  ingredients: readonly CraftingIngredient[];
}

export interface InventoryStack {
  ingredientId: string;
  quantity: number;
}

export interface CraftingState {
  inventory: readonly InventoryStack[];
  craftedEquipmentIds: readonly string[];
}

export type CraftingError =
  | 'INVALID_RECIPE'
  | 'INVALID_INVENTORY'
  | 'INSUFFICIENT_INGREDIENTS'
  | 'ALREADY_CRAFTED';

export type CraftingResult =
  | { ok: true; state: CraftingState; outputId: string }
  | { ok: false; state: CraftingState; error: CraftingError };

// Chưa đăng ký recipe gameplay khi data chưa được duyệt.
export const CRAFTING_RECIPES: readonly CraftingRecipe[] =
  Object.freeze([]);

export function isValidRecipe(recipe: CraftingRecipe): boolean {
  if (
    !recipe ||
    typeof recipe.id !== 'string' ||
    !recipe.id.trim() ||
    typeof recipe.outputId !== 'string' ||
    !recipe.outputId.trim() ||
    !Array.isArray(recipe.ingredients) ||
    recipe.ingredients.length === 0
  ) {
    return false;
  }

  const seen = new Set<string>();

  for (const ingredient of recipe.ingredients) {
    if (
      !ingredient ||
      typeof ingredient.ingredientId !== 'string' ||
      !ingredient.ingredientId.trim() ||
      !Number.isInteger(ingredient.quantity) ||
      ingredient.quantity <= 0 ||
      seen.has(ingredient.ingredientId)
    ) {
      return false;
    }

    seen.add(ingredient.ingredientId);
  }

  return true;
}

function isValidInventory(
  inventory: readonly InventoryStack[]
): boolean {
  if (!Array.isArray(inventory)) return false;

  const seen = new Set<string>();

  for (const stack of inventory) {
    if (
      !stack ||
      typeof stack.ingredientId !== 'string' ||
      !stack.ingredientId.trim() ||
      !Number.isInteger(stack.quantity) ||
      stack.quantity < 0 ||
      seen.has(stack.ingredientId)
    ) {
      return false;
    }

    seen.add(stack.ingredientId);
  }

  return true;
}

export function canCraft(
  state: CraftingState,
  recipe: CraftingRecipe
): CraftingError | null {
  if (!isValidRecipe(recipe)) return 'INVALID_RECIPE';

  if (!state || !isValidInventory(state.inventory)) {
    return 'INVALID_INVENTORY';
  }

  if (
    !Array.isArray(state.craftedEquipmentIds) ||
    state.craftedEquipmentIds.some(
      (id) => typeof id !== 'string' || !id.trim()
    )
  ) {
    return 'INVALID_INVENTORY';
  }

  if (state.craftedEquipmentIds.includes(recipe.outputId)) {
    return 'ALREADY_CRAFTED';
  }

  for (const ingredient of recipe.ingredients) {
    const stack = state.inventory.find(
      (item) => item.ingredientId === ingredient.ingredientId
    );

    if (!stack || stack.quantity < ingredient.quantity) {
      return 'INSUFFICIENT_INGREDIENTS';
    }
  }

  return null;
}

/** Craft atomically; failure never consumes materials. */
export function craftItem(
  state: CraftingState,
  recipe: CraftingRecipe
): CraftingResult {
  const error = canCraft(state, recipe);

  if (error) {
    return { ok: false, state, error };
  }

  const remaining = state.inventory.map((stack) => {
    const requirement = recipe.ingredients.find(
      (item) => item.ingredientId === stack.ingredientId
    );

    return {
      ingredientId: stack.ingredientId,
      quantity: stack.quantity - (requirement?.quantity ?? 0),
    };
  });

  const nextState: CraftingState = {
    inventory: remaining.filter((stack) => stack.quantity > 0),
    craftedEquipmentIds: [
      ...state.craftedEquipmentIds,
      recipe.outputId,
    ],
  };

  return {
    ok: true,
    state: nextState,
    outputId: recipe.outputId,
  };
}
