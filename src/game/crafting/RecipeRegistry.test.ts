
import { describe, expect, it } from "vitest";
import type { CraftingRecipe } from "./CraftingSystem";
import { createRecipeRegistry } from "./RecipeRegistry";

function createRecipe(
  overrides: Partial<CraftingRecipe> = {},
): CraftingRecipe {
  return {
    id: "test-recipe",
    status: "APPROVED",
    ingredients: [
      { resourceId: "crystal-water", quantity: 2 },
      { resourceId: "crystal-salt", quantity: 1 },
    ],
    output: {
      resourceId: "crystal-compound",
      quantity: 1,
    },
    ...overrides,
  };
}

describe("createRecipeRegistry", () => {
  it("creates an empty registry", () => {
    const result = createRecipeRegistry([]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(Object.keys(result.registry)).toHaveLength(0);
      expect(Object.isFrozen(result.registry)).toBe(true);
    }
  });

  it("registers a valid approved recipe", () => {
    const recipe = createRecipe();
    const result = createRecipeRegistry([recipe]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.registry[recipe.id]).toMatchObject(recipe);
    }
  });

  it("allows recipes in review lifecycle states", () => {
    const statuses = [
      "DRAFT",
      "REVIEW_REQUIRED",
      "APPROVED",
      "REJECTED",
    ] as const;

    for (const status of statuses) {
      const recipe = createRecipe({
        id: `recipe-${status.toLowerCase()}`,
        status,
      });

      const result = createRecipeRegistry([recipe]);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.registry[recipe.id].status).toBe(status);
      }
    }
  });

  it("rejects duplicate recipe IDs", () => {
    const first = createRecipe();
    const second = createRecipe({
      ingredients: [
        { resourceId: "crystal-iron", quantity: 1 },
      ],
    });

    const result = createRecipeRegistry([first, second]);

    expect(result).toMatchObject({
      success: false,
      error: "DUPLICATE_RECIPE_ID",
    });
  });

  it("rejects invalid recipe data", () => {
    const invalidRecipe = createRecipe({
      output: {
        resourceId: "crystal-compound",
        quantity: 0,
      },
    });

    const result = createRecipeRegistry([invalidRecipe]);

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_RECIPE",
    });
  });

  it("rejects invalid lifecycle status", () => {
    const invalidRecipe = {
      ...createRecipe(),
      status: "PENDING",
    } as unknown as CraftingRecipe;

    const result = createRecipeRegistry([invalidRecipe]);

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_RECIPE",
    });
  });

  it("does not expose a partially built registry after failure", () => {
    const validRecipe = createRecipe();

    const invalidRecipe = createRecipe({
      id: "invalid-recipe",
      output: {
        resourceId: "crystal-compound",
        quantity: 0,
      },
    });

    const result = createRecipeRegistry([
      validRecipe,
      invalidRecipe,
    ]);

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_RECIPE",
    });
  });

  it("freezes registry, recipes, ingredients, and output", () => {
    const result = createRecipeRegistry([createRecipe()]);

    expect(result.success).toBe(true);

    if (result.success) {
      const registered = result.registry["test-recipe"];

      expect(Object.isFrozen(result.registry)).toBe(true);
      expect(Object.isFrozen(registered)).toBe(true);
      expect(Object.isFrozen(registered.ingredients)).toBe(true);
      expect(Object.isFrozen(registered.ingredients[0])).toBe(true);
      expect(Object.isFrozen(registered.output)).toBe(true);
    }
  });

  it("does not retain mutable references to input recipe data", () => {
    const source = createRecipe();
    const result = createRecipeRegistry([source]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.registry[source.id]).not.toBe(source);
      expect(result.registry[source.id].ingredients).not.toBe(
        source.ingredients,
      );
      expect(result.registry[source.id].output).not.toBe(
        source.output,
      );
    }
  });

  it("safely supports special canonical recipe IDs", () => {
    const recipe = createRecipe({
      id: "__proto__",
    });

    const result = createRecipeRegistry([recipe]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(
        Object.prototype.hasOwnProperty.call(
          result.registry,
          "__proto__",
        ),
      ).toBe(true);

      expect(result.registry["__proto__"].id).toBe("__proto__");
    }
  });
});
