
import { describe, expect, it } from "vitest";
import {
  CRAFTING_RECIPES,
  type CraftingRecipe,
  type RecipeRegistry,
} from "./CraftingSystem";
import { CraftingTransactionAdapter } from "./CraftingTransactionAdapter";
import { InventoryTransactionService } from "../inventory/InventoryTransactionService";
import type { RuntimeInventoryState } from "../inventory/RuntimeInventorySystem";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error("Simulated storage failure");
    }

    this.values.set(key, String(value));
  }
}

const recipe: CraftingRecipe = {
  id: "test-craft-recipe",
  ingredients: [
    { resourceId: "crystal-water", quantity: 2 },
    { resourceId: "crystal-salt", quantity: 1 },
  ],
  output: {
    resourceId: "crystal-compound",
    quantity: 1,
  },
};

const registry: RecipeRegistry = {
  [recipe.id]: recipe,
};

function createService(
  resources: Record<string, number> = {},
  storage: Storage = new MemoryStorage(),
): InventoryTransactionService {
  const inventory: RuntimeInventoryState = { resources };

  return new InventoryTransactionService(
    inventory,
    0,
    storage,
  );
}

describe("CraftingTransactionAdapter", () => {
  it("keeps the production crafting registry empty", () => {
    expect(Object.keys(CRAFTING_RECIPES)).toHaveLength(0);
  });

  it("crafts through the inventory transaction service", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    const result = adapter.execute(
      "tx-craft-001",
      recipe.id,
      0,
    );

    expect(result).toMatchObject({
      success: true,
      recipeId: recipe.id,
      produced: recipe.output,
      revision: 1,
      inventory: {
        "crystal-water": 2,
        "crystal-salt": 1,
        "crystal-compound": 1,
      },
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("rejects unknown recipes without changing inventory", () => {
    const service = createService({
      "crystal-water": 4,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    expect(
      adapter.execute("tx-craft-002", "missing-recipe", 0),
    ).toMatchObject({
      success: false,
      error: "UNKNOWN_RECIPE",
    });

    expect(service.getSnapshot().revision).toBe(0);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 4,
    });
  });

  it("rejects insufficient materials atomically", () => {
    const service = createService({
      "crystal-water": 1,
      "crystal-salt": 1,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    expect(
      adapter.execute("tx-craft-003", recipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });

    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 1,
          "crystal-salt": 1,
        },
      },
      revision: 0,
    });
  });

  it("rejects one-shot recipes because their state is not persisted", () => {
    const oneShotRecipe: CraftingRecipe = {
      ...recipe,
      oneShot: true,
    };

    const oneShotRegistry: RecipeRegistry = {
      [oneShotRecipe.id]: oneShotRecipe,
    };

    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      oneShotRegistry,
    );

    expect(
      adapter.execute("tx-craft-004", oneShotRecipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "UNSUPPORTED_ONE_SHOT",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("rejects non-crystal resource IDs", () => {
    const invalidRecipe: CraftingRecipe = {
      ...recipe,
      ingredients: [
        { resourceId: "water", quantity: 1 },
      ],
    };

    const invalidRegistry: RecipeRegistry = {
      [invalidRecipe.id]: invalidRecipe,
    };

    const service = createService({
      "crystal-water": 4,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      invalidRegistry,
    );

    expect(
      adapter.execute("tx-craft-005", invalidRecipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "INVALID_RESOURCE_ID",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("rejects invalid recipe quantities", () => {
    const invalidRecipe: CraftingRecipe = {
      ...recipe,
      output: {
        resourceId: "crystal-compound",
        quantity: 0,
      },
    };

    const invalidRegistry: RecipeRegistry = {
      [invalidRecipe.id]: invalidRecipe,
    };

    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      invalidRegistry,
    );

    expect(
      adapter.execute("tx-craft-006", invalidRecipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "INVALID_RECIPE",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("supports an idempotent retry with the original expected revision", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    const first = adapter.execute(
      "tx-craft-007",
      recipe.id,
      0,
    );

    const retry = adapter.execute(
      "tx-craft-007",
      recipe.id,
      0,
    );

    expect(first).toMatchObject({ success: true });
    expect(retry).toMatchObject({ success: true });

    expect(service.getSnapshot().revision).toBe(1);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 2,
      "crystal-salt": 1,
      "crystal-compound": 1,
    });
  });

  it("rejects reuse of a transaction ID for a different recipe", () => {
    const secondRecipe: CraftingRecipe = {
      id: "test-craft-second-recipe",
      ingredients: [
        { resourceId: "crystal-water", quantity: 1 },
      ],
      output: {
        resourceId: "crystal-steam",
        quantity: 1,
      },
    };

    const combinedRegistry: RecipeRegistry = {
      [recipe.id]: recipe,
      [secondRecipe.id]: secondRecipe,
    };

    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      combinedRegistry,
    );

    expect(
      adapter.execute("tx-craft-008", recipe.id, 0).success,
    ).toBe(true);

    expect(
      adapter.execute("tx-craft-008", secondRecipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("rejects stale inventory revisions", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    expect(
      adapter.execute("tx-craft-009", recipe.id, 99),
    ).toMatchObject({
      success: false,
      error: "REVISION_CONFLICT",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("preserves inventory when durable preparation fails", () => {
    const storage = new MemoryStorage();

    const service = createService(
      {
        "crystal-water": 4,
        "crystal-salt": 2,
      },
      storage,
    );

    storage.failWrites = true;

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    expect(
      adapter.execute("tx-craft-010", recipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "PERSISTENCE_FAILED",
    });

    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 4,
          "crystal-salt": 2,
        },
      },
      revision: 0,
    });
  });

  it("does not recommit a transaction recovered as rolled back", () => {
    const storage = new MemoryStorage();

    const service = createService(
      {
        "crystal-water": 4,
        "crystal-salt": 2,
      },
      storage,
    );

    const adapter = new CraftingTransactionAdapter(
      service,
      registry,
    );

    expect(
      service.prepare("tx-craft-011", {
        id: recipe.id,
        inputs: recipe.ingredients,
        outputs: [recipe.output],
      }).success,
    ).toBe(true);

    expect(service.rollback("tx-craft-011").success).toBe(true);

    const restoredService = new InventoryTransactionService(
      { resources: {} },
      0,
      storage,
    );

    const restoredAdapter = new CraftingTransactionAdapter(
      restoredService,
      registry,
    );

    expect(
      restoredAdapter.execute(
        "tx-craft-011",
        recipe.id,
        0,
      ),
    ).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_ROLLED_BACK",
    });

    expect(restoredService.getSnapshot().revision).toBe(0);
    expect(restoredService.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
  });
});
