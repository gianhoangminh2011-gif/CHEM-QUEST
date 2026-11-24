
import {
  validateRecipe,
  type CraftingRecipe,
  type RecipeRegistry,
} from "./CraftingSystem";

export type RecipeRegistryErrorCode =
  | "INVALID_RECIPE"
  | "DUPLICATE_RECIPE_ID";

export type RecipeRegistryResult =
  | {
      readonly success: true;
      readonly registry: RecipeRegistry;
    }
  | {
      readonly success: false;
      readonly error: RecipeRegistryErrorCode;
      readonly message: string;
    };

function fail(
  error: RecipeRegistryErrorCode,
  message: string,
): RecipeRegistryResult {
  return {
    success: false,
    error,
    message,
  };
}

/**
 * Creates an immutable registry from recipe definitions.
 * All lifecycle states may be registered, but only APPROVED
 * recipes may be crafted by CraftingTransactionAdapter.
 */
export function createRecipeRegistry(
  recipes: readonly CraftingRecipe[],
): RecipeRegistryResult {
  if (!Array.isArray(recipes)) {
    return fail(
      "INVALID_RECIPE",
      "Recipe definitions must be provided as an array.",
    );
  }

  // A null-prototype object safely supports IDs such as "__proto__".
  const registry = Object.create(null) as Record<
    string,
    CraftingRecipe
  >;

  for (const recipe of recipes) {
    const validationError = validateRecipe(recipe);

    if (validationError !== null) {
      return fail("INVALID_RECIPE", validationError);
    }

    if (Object.prototype.hasOwnProperty.call(registry, recipe.id)) {
      return fail(
        "DUPLICATE_RECIPE_ID",
        `Duplicate recipe ID "${recipe.id}".`,
      );
    }

    const frozenIngredients = Object.freeze(
      recipe.ingredients.map((ingredient) =>
        Object.freeze({ ...ingredient }),
      ),
    );

    const frozenOutput = Object.freeze({
      ...recipe.output,
    });

    const frozenRecipe: CraftingRecipe = Object.freeze({
      id: recipe.id,
      status: recipe.status,
      ingredients: frozenIngredients,
      output: frozenOutput,
      ...(recipe.oneShot === undefined
        ? {}
        : { oneShot: recipe.oneShot }),
    });

    registry[recipe.id] = frozenRecipe;
  }

  return {
    success: true,
    registry: Object.freeze(registry),
  };
}
