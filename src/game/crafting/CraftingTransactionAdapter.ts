
import {
  CRAFTING_RECIPES,
  validateRecipe,
  type CraftingRecipe,
  type RecipeRegistry,
} from "./CraftingSystem";

import {
  InventoryTransactionService,
  type InventoryTransactionErrorCode,
} from "../inventory/InventoryTransactionService";

import type { ReactionDefinition } from "../chemistry/ReactionEngine";

export type CraftingTransactionError =
  | "UNKNOWN_RECIPE"
  | "INVALID_RECIPE"
  | "RECIPE_NOT_APPROVED"
  | "UNSUPPORTED_ONE_SHOT"
  | "INVALID_RESOURCE_ID"
  | InventoryTransactionErrorCode;

export type CraftingTransactionResult =
  | {
      success: true;
      recipeId: string;
      produced: CraftingRecipe["output"];
      revision: number;
      inventory: Readonly<Record<string, number>>;
    }
  | {
      success: false;
      error: CraftingTransactionError;
      message: string;
    };

function isCanonicalResourceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("crystal-") &&
    value.trim() === value &&
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  );
}

export class CraftingTransactionAdapter {
  constructor(
    private readonly transactions: InventoryTransactionService,
    private readonly registry: RecipeRegistry = CRAFTING_RECIPES,
  ) {}

  execute(
    transactionId: string,
    recipeId: string,
    expectedRevision?: number,
  ): CraftingTransactionResult {
    if (
      typeof recipeId !== "string" ||
      recipeId.trim() !== recipeId ||
      !Object.prototype.hasOwnProperty.call(this.registry, recipeId)
    ) {
      return {
        success: false,
        error: "UNKNOWN_RECIPE",
        message: `Unknown recipe "${String(recipeId)}".`,
      };
    }

    const recipe = this.registry[recipeId];

    if (!recipe || recipe.id !== recipeId) {
      return {
        success: false,
        error: "INVALID_RECIPE",
        message: "Recipe registry key must match recipe.id.",
      };
    }

    const validationError = validateRecipe(recipe);

    if (validationError !== null) {
      return {
        success: false,
        error: "INVALID_RECIPE",
        message: validationError,
      };
    }

    // Never allow unapproved recipes to reach inventory transactions.
    if (recipe.status !== "APPROVED") {
      return {
        success: false,
        error: "RECIPE_NOT_APPROVED",
        message: `Recipe "${recipe.id}" is not approved for crafting.`,
      };
    }

    if (recipe.oneShot === true) {
      return {
        success: false,
        error: "UNSUPPORTED_ONE_SHOT",
        message:
          "One-shot recipes are not supported by the current inventory contract.",
      };
    }

    const materials = [...recipe.ingredients, recipe.output];

    if (!materials.every((item) => isCanonicalResourceId(item.resourceId))) {
      return {
        success: false,
        error: "INVALID_RESOURCE_ID",
        message: "Crafting materials must use valid crystal- resource IDs.",
      };
    }

    const inputIds = recipe.ingredients.map((item) => item.resourceId);

    if (new Set(inputIds).size !== inputIds.length) {
      return {
        success: false,
        error: "INVALID_RECIPE",
        message: "Duplicate input resource IDs are not allowed.",
      };
    }

    const reaction: ReactionDefinition = {
      id: recipe.id,
      inputs: recipe.ingredients.map((item) => ({
        resourceId: item.resourceId,
        quantity: item.quantity,
      })),
      outputs: [
        {
          resourceId: recipe.output.resourceId,
          quantity: recipe.output.quantity,
        },
      ],
    };

    const prepared = this.transactions.prepare(
      transactionId,
      reaction,
      expectedRevision,
    );

    if (!prepared.success) {
      return {
        success: false,
        error: prepared.error,
        message: prepared.message,
      };
    }

    const committed = this.transactions.commit(transactionId);

    if (!committed.success) {
      return {
        success: false,
        error: committed.error,
        message: committed.message,
      };
    }

    const snapshot = this.transactions.getSnapshot();

    return {
      success: true,
      recipeId: recipe.id,
      produced: { ...recipe.output },
      revision: snapshot.revision,
      inventory: snapshot.inventory.resources,
    };
  }
}
