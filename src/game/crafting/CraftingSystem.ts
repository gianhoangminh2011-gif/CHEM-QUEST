
/**
 * Crafting Core — pure system, independent from Phaser/React.
 * Recipe registry remains empty pending PD-approved game data.
 */

export type ResourceCounts = Readonly<Record<string, number>>;

export interface CraftingIngredient {
  readonly resourceId: string;
  readonly quantity: number;
}

export type RecipeApprovalStatus =
  | 'DRAFT'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

export interface CraftingRecipe {
  readonly id: string;
  readonly ingredients: readonly CraftingIngredient[];
  readonly output: CraftingIngredient;
  readonly status: RecipeApprovalStatus;
  readonly oneShot?: boolean;
}

export type RecipeRegistry = Readonly<Record<string, CraftingRecipe>>;

export interface CraftingState {
  readonly resources: ResourceCounts;
  readonly craftedRecipeIds: readonly string[];
}

export type CraftingErrorCode =
  | 'UNKNOWN_RECIPE'
  | 'INVALID_RECIPE'
  | 'RECIPE_NOT_APPROVED'
  | 'INVALID_INVENTORY'
  | 'INSUFFICIENT_INGREDIENTS'
  | 'ALREADY_CRAFTED';

export type CraftingResult =
  | {
      readonly ok: true;
      readonly recipeId: string;
      readonly produced: CraftingIngredient;
    }
  | {
      readonly ok: false;
      readonly error: CraftingErrorCode;
      readonly message: string;
    };

export interface CraftingOutcome {
  readonly state: CraftingState;
  readonly result: CraftingResult;
}

/** No approved recipe data yet. */
export const CRAFTING_RECIPES: RecipeRegistry = Object.freeze({});

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isCanonicalId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isRecipeApprovalStatus(
  value: unknown,
): value is RecipeApprovalStatus {
  return (
    value === 'DRAFT' ||
    value === 'REVIEW_REQUIRED' ||
    value === 'APPROVED' ||
    value === 'REJECTED'
  );
}

/** Returns an error message when a recipe is invalid, otherwise null. */
export function validateRecipe(
  recipe: CraftingRecipe,
): string | null {
  if (!recipe || !isCanonicalId(recipe.id)) {
    return 'Recipe id must be a non-empty, trimmed string.';
  }

  if (!isRecipeApprovalStatus(recipe.status)) {
    return 'Recipe status must be DRAFT, REVIEW_REQUIRED, APPROVED, or REJECTED.';
  }

  if (
    !Array.isArray(recipe.ingredients) ||
    recipe.ingredients.length === 0
  ) {
    return 'Recipe must have at least one ingredient.';
  }

  const seen = new Set<string>();

  for (const ing of recipe.ingredients) {
    if (!ing || !isCanonicalId(ing.resourceId)) {
      return 'Ingredient resourceId must be a non-empty, trimmed string.';
    }

    if (!isPositiveSafeInteger(ing.quantity)) {
      return `Ingredient "${ing.resourceId}" quantity must be a positive safe integer.`;
    }

    if (seen.has(ing.resourceId)) {
      return `Duplicate ingredient id "${ing.resourceId}".`;
    }

    seen.add(ing.resourceId);
  }

  if (
    !recipe.output ||
    !isCanonicalId(recipe.output.resourceId)
  ) {
    return 'Output resourceId must be a non-empty, trimmed string.';
  }

  if (!isPositiveSafeInteger(recipe.output.quantity)) {
    return 'Output quantity must be a positive safe integer.';
  }

  if (
    recipe.oneShot !== undefined &&
    typeof recipe.oneShot !== 'boolean'
  ) {
    return 'oneShot must be a boolean when provided.';
  }

  return null;
}

function validateInventory(
  state: CraftingState,
): string | null {
  if (
    !state ||
    typeof state !== 'object' ||
    !state.resources ||
    typeof state.resources !== 'object' ||
    Array.isArray(state.resources)
  ) {
    return 'Resources must be a valid resource-count object.';
  }

  for (const [resourceId, quantity] of Object.entries(
    state.resources,
  )) {
    if (!isCanonicalId(resourceId)) {
      return 'Inventory resource IDs must be non-empty and trimmed.';
    }

    if (!isNonNegativeSafeInteger(quantity)) {
      return `Inventory quantity for "${resourceId}" must be a non-negative safe integer.`;
    }
  }

  if (!Array.isArray(state.craftedRecipeIds)) {
    return 'craftedRecipeIds must be an array.';
  }

  const seen = new Set<string>();

  for (const id of state.craftedRecipeIds) {
    if (!isCanonicalId(id) || seen.has(id)) {
      return 'craftedRecipeIds must contain unique, non-empty, trimmed IDs.';
    }

    seen.add(id);
  }

  return null;
}

function fail(
  state: CraftingState,
  error: CraftingErrorCode,
  message: string,
): CraftingOutcome {
  // Failed operations preserve the original state reference.
  return {
    state,
    result: {
      ok: false,
      error,
      message,
    },
  };
}

/** Crafts once. Inputs are not mutated; failures return original state. */
export function craft(
  state: CraftingState,
  recipeId: string,
  registry: RecipeRegistry = CRAFTING_RECIPES,
): CraftingOutcome {
  // Validate state before attempting to craft.
  const inventoryError = validateInventory(state);

  if (inventoryError !== null) {
    return fail(
      state,
      'INVALID_INVENTORY',
      inventoryError,
    );
  }

  if (
    !isCanonicalId(recipeId) ||
    !registry ||
    typeof registry !== 'object' ||
    !hasOwn(registry, recipeId)
  ) {
    return fail(
      state,
      'UNKNOWN_RECIPE',
      `Unknown recipe "${String(recipeId)}".`,
    );
  }

  const recipe = registry[recipeId];

  // Prevent registry key / recipe identity mismatch.
  if (!recipe || recipe.id !== recipeId) {
    return fail(
      state,
      'INVALID_RECIPE',
      'Recipe registry key must match recipe.id.',
    );
  }

  const invalid = validateRecipe(recipe);

  if (invalid !== null) {
    return fail(state, 'INVALID_RECIPE', invalid);
  }

  // Only explicitly approved recipes may be crafted.
  if (recipe.status !== 'APPROVED') {
    return fail(
      state,
      'RECIPE_NOT_APPROVED',
      `Recipe "${recipe.id}" is not approved for crafting.`,
    );
  }

  if (
    recipe.oneShot === true &&
    state.craftedRecipeIds.includes(recipe.id)
  ) {
    return fail(
      state,
      'ALREADY_CRAFTED',
      `Recipe "${recipe.id}" was already crafted.`,
    );
  }

  // Check all ingredients before changing anything.
  for (const ing of recipe.ingredients) {
    const have = hasOwn(state.resources, ing.resourceId)
      ? state.resources[ing.resourceId]
      : 0;

    if (have < ing.quantity) {
      return fail(
        state,
        'INSUFFICIENT_INGREDIENTS',
        `Not enough "${ing.resourceId}": need ${ing.quantity}, have ${have}.`,
      );
    }
  }

  // Work on a fresh copy to preserve input immutability.
  const next: Record<string, number> = {
    ...state.resources,
  };

  // Consume ingredients.
  for (const ing of recipe.ingredients) {
    const left = next[ing.resourceId] - ing.quantity;

    if (left === 0) {
      delete next[ing.resourceId];
    } else {
      next[ing.resourceId] = left;
    }
  }

  // Add output safely, including output matching an ingredient.
  const outId = recipe.output.resourceId;

  const currentOutput = hasOwn(next, outId)
    ? next[outId]
    : 0;

  const totalOutput =
    currentOutput + recipe.output.quantity;

  // Prevent unsafe numeric inventory state.
  if (!Number.isSafeInteger(totalOutput)) {
    return fail(
      state,
      'INVALID_RECIPE',
      'Crafting output exceeds the safe integer limit.',
    );
  }

  next[outId] = totalOutput;

  return {
    state: {
      resources: next,
      craftedRecipeIds:
        recipe.oneShot === true
          ? [...state.craftedRecipeIds, recipe.id]
          : state.craftedRecipeIds,
    },
    result: {
      ok: true,
      recipeId: recipe.id,
      produced: { ...recipe.output },
    },
  };
}
