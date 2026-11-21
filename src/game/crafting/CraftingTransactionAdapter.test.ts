
import { describe, expect, it } from "vitest";
import {
  CraftingTransactionAdapter,
} from "./CraftingTransactionAdapter";
import {
  CRAFTING_RECIPES,
  type CraftingRecipe,
  type RecipeRegistry,
} from "./CraftingSystem";
import { InventoryTransactionService } from "../inventory/InventoryTransactionService";
import type { RuntimeInventoryState } from "../inventory/RuntimeInventorySystem";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

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
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
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

  return new InventoryTransactionService(inventory, 0, storage);
}

describe("CraftingTransactionAdapter", () => {
  it("keeps the production recipe registry empty", () => {
    expect(Object.keys(CRAFTING_RECIPES)).toHaveLength(0);

    const adapter = new CraftingTransactionAdapter(
      createService({ "crystal-water": 5 }),
    );

    expect(adapter.execute("tx-empty-registry", recipe.id)).toMatchObject({
      success: false,
      error: "UNKNOWN_RECIPE",
    });
  });

  it("executes crafting through the supplied transaction service", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
    const adapter = new CraftingTransactionAdapter(service, registry);

    const result = adapter.execute("tx-craft-001", recipe.id, 0);

    expect(result).toMatchObject({
      success: true,
      recipeId: recipe.id,
      produced: recipe.output,
      revision: 1,
      inventory: {
        "crystal-water": 2,
        "crystal-compound": 1,
        "crystal-salt": 1,
      },
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("does not mutate inventory when ingredients are insufficient", () => {
    const service = createService({ "crystal-water": 1 });
    const before = service.getSnapshot();
    const adapter = new CraftingTransactionAdapter(service, registry);

    expect(adapter.execute("tx-craft-002", recipe.id)).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });

    expect(service.getSnapshot()).toEqual(before);
  });

  it("rejects one-shot recipes because their state is not persisted", () => {
    const oneShotRegistry: RecipeRegistry = {
      [recipe.id]: { ...recipe, oneShot: true },
    };
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
    const adapter = new CraftingTransactionAdapter(
      service,
      oneShotRegistry,
    );

    expect(adapter.execute("tx-craft-003", recipe.id)).toMatchObject({
      success: false,
      error: "UNSUPPORTED_ONE_SHOT",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("rejects resource IDs outside the crystal contract", () => {
    const invalidRegistry: RecipeRegistry = {
      [recipe.id]: {
        ...recipe,
        ingredients: [
          { resourceId: "water", quantity: 1 },
        ],
      },
    };
    const adapter = new CraftingTransactionAdapter(
      createService({ "crystal-water": 4 }),
      invalidRegistry,
    );

    expect(adapter.execute("tx-craft-004", recipe.id)).toMatchObject({
      success: false,
      error: "INVALID_RESOURCE_ID",
    });
  });

  it("rejects invalid recipes before preparing a transaction", () => {
    const invalidRegistry: RecipeRegistry = {
      [recipe.id]: {
        ...recipe,
        ingredients: [],
      },
    };
    const service = createService();
    const adapter = new CraftingTransactionAdapter(
      service,
      invalidRegistry,
    );

    expect(adapter.execute("tx-craft-005", recipe.id)).toMatchObject({
      success: false,
      error: "INVALID_RECIPE",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("returns the same committed result for an identical retry", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
    const adapter = new CraftingTransactionAdapter(service, registry);

    const first = adapter.execute("tx-craft-006", recipe.id, 0);
    const retry = adapter.execute("tx-craft-006", recipe.id, 0);

    expect(first).toEqual(retry);
    expect(service.getSnapshot().revision).toBe(1);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 2,
      "crystal-salt": 1,
      "crystal-compound": 1,
    });
  });

  it("rejects a reused transaction ID with a different recipe fingerprint", () => {
    const otherRecipe: CraftingRecipe = {
      id: "test-craft-other",
      ingredients: [
        { resourceId: "crystal-water", quantity: 1 },
      ],
      output: {
        resourceId: "crystal-steam",
        quantity: 1,
      },
    };
    const service = createService({
      "crystal-water": 5,
      "crystal-salt": 2,
    });
    const adapter = new CraftingTransactionAdapter(service, {
      ...registry,
      [otherRecipe.id]: otherRecipe,
    });

    expect(adapter.execute("tx-craft-007", recipe.id, 0).success).toBe(true);

    expect(
      adapter.execute("tx-craft-007", otherRecipe.id, 0),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("rejects stale expected revisions without changing inventory", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
    const adapter = new CraftingTransactionAdapter(service, registry);

    expect(
      adapter.execute("tx-craft-008", recipe.id, 99),
    ).toMatchObject({
      success: false,
      error: "REVISION_CONFLICT",
    });

    expect(service.getSnapshot().revision).toBe(0);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
  });

  it("does not consume resources when durable commit fails", () => {
    class FailingCommitStorage extends MemoryStorage {
      private writes = 0;

      override setItem(key: string, value: string): void {
        this.writes += 1;

        // Allow initial snapshot and PREPARED journal.
        // Fail the subsequent COMMITTED snapshot.
        if (this.writes >= 3) {
          throw new Error("Simulated durable write failure.");
        }

        super.setItem(key, value);
      }
    }

    const service = createService(
      {
        "crystal-water": 4,
        "crystal-salt": 2,
      },
      new FailingCommitStorage(),
    );
    const adapter = new CraftingTransactionAdapter(service, registry);

    expect(
      adapter.execute("tx-craft-009", recipe.id),
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

  it("does not commit a transaction that was already rolled back", () => {
    const service = createService({
      "crystal-water": 4,
      "crystal-salt": 2,
    });
    const adapter = new CraftingTransactionAdapter(service, registry);

    // First execution prepares and commits.
    expect(adapter.execute("tx-craft-010", recipe.id).success).toBe(true);

    // A committed transaction cannot be rolled back by the service.
    expect(service.rollback("tx-craft-010")).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_COMMITTED",
    });
  });
});
