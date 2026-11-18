/**
 * Crafting Core — DRAFT (chưa đối chiếu với file thực trên nhánh).
 * Hàm thuần: không mutate input, không phụ thuộc Phaser/React/Inventory thật.
 * Registry rỗng có chủ đích: chờ dữ liệu recipe được PD duyệt.
 */

export type ResourceCounts = Readonly<Record<string, number>>;

export interface CraftingIngredient {
  readonly resourceId: string;
  readonly quantity: number;
}

export interface CraftingRecipe {
  readonly id: string;
  readonly ingredients: readonly CraftingIngredient[];
  readonly output: CraftingIngredient;
  /** true: recipe chỉ craft được một lần (duplicate-crafting prevention). */
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

/** Chưa có dữ liệu recipe được duyệt. */
export const CRAFTING_RECIPES: RecipeRegistry = Object.freeze({});

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** Trả về thông báo lỗi nếu recipe không hợp lệ, hoặc null nếu hợp lệ. */
export function validateRecipe(recipe: CraftingRecipe): string | null {
  if (!isNonEmptyId(recipe.id)) return 'Recipe id must be a non-empty string.';
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return 'Recipe must have at least one ingredient.';
  }
  const seen = new Set<string>();
  for (const ing of recipe.ingredients) {
    if (!isNonEmptyId(ing.resourceId)) {
      return 'Ingredient resourceId must be a non-empty string.';
    }
    if (!isPositiveInteger(ing.quantity)) {
      return `Ingredient "${ing.resourceId}" quantity must be a positive integer.`;
    }
    if (seen.has(ing.resourceId)) {
      return `Duplicate ingredient id "${ing.resourceId}".`;
    }
    seen.add(ing.resourceId);
  }
  if (!recipe.output || !isNonEmptyId(recipe.output.resourceId)) {
    return 'Output resourceId must be a non-empty string.';
  }
  if (!isPositiveInteger(recipe.output.quantity)) {
    return 'Output quantity must be a positive integer.';
  }
  return null;
}

function fail(
  state: CraftingState,
  error: CraftingErrorCode,
  message: string,
): CraftingOutcome {
  // Thất bại: trả lại đúng state cũ (atomic, không thay đổi gì).
  return { state, result: { ok: false, error, message } };
}

/** Craft một lần. Không mutate `state`; thất bại thì state giữ nguyên. */
export function craft(
  state: CraftingState,
  recipeId: string,
  registry: RecipeRegistry = CRAFTING_RECIPES,
): CraftingOutcome {
  if (!isNonEmptyId(recipeId) || !hasOwn(registry, recipeId)) {
    return fail(state, 'UNKNOWN_RECIPE', `Unknown recipe "${String(recipeId)}".`);
  }
  const recipe = registry[recipeId];

  const invalid = validateRecipe(recipe);
  if (invalid !== null) return fail(state, 'INVALID_RECIPE', invalid);

  if (recipe.oneShot === true && state.craftedRecipeIds.includes(recipe.id)) {
    return fail(state, 'ALREADY_CRAFTED', `Recipe "${recipe.id}" was already crafted.`);
  }

  // Kiểm tra toàn bộ nguyên liệu TRƯỚC khi thay đổi bất cứ thứ gì.
  for (const ing of recipe.ingredients) {
    const have = hasOwn(state.resources, ing.resourceId)
      ? state.resources[ing.resourceId]
      : 0;
    if (!(have >= ing.quantity)) {
      return fail(
        state,
        'INSUFFICIENT_INGREDIENTS',
        `Not enough "${ing.resourceId}": need ${ing.quantity}, have ${have}.`,
      );
    }
  }

  const next: Record<string, number> = { ...state.resources };
  for (const ing of recipe.ingredients) {
    const left = next[ing.resourceId] - ing.quantity;
    if (left === 0) delete next[ing.resourceId];
    else next[ing.resourceId] = left;
  }
  const outId = recipe.output.resourceId;
  next[outId] = (hasOwn(next, outId) ? next[outId] : 0) + recipe.output.quantity;

  return {
    state: {
      resources: next,
      craftedRecipeIds:
        recipe.oneShot === true
          ? [...state.craftedRecipeIds, recipe.id]
          : state.craftedRecipeIds,
    },
    result: { ok: true, recipeId: recipe.id, produced: { ...recipe.output } },
  };
}
