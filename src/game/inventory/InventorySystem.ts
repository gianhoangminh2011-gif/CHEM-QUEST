
import {
  craft,
  type CraftingState,
  type CraftingOutcome,
  type RecipeRegistry,
} from '../crafting/CraftingSystem';

export type InventoryCounts = Readonly<Record<string, number>>;

export interface InventoryState extends CraftingState {}

export type InventoryError =
  | 'INVALID_RESOURCE_ID'
  | 'INVALID_QUANTITY'
  | 'INSUFFICIENT_RESOURCE';

export interface InventoryTransition {
  readonly state: InventoryState;
  readonly ok: boolean;
  readonly error?: InventoryError;
}

export function createInventoryState(): InventoryState {
  return {
    resources: Object.create(null) as Record<string, number>,
    craftedRecipeIds: [],
  };
}

function isValidId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.trim() === id
  );
}

function isValidQuantity(quantity: unknown): quantity is number {
  return (
    typeof quantity === 'number' &&
    Number.isSafeInteger(quantity) &&
    quantity > 0
  );
}

export function collectResource(
  state: InventoryState,
  resourceId: string,
  quantity = 1,
): InventoryTransition {
  if (!isValidId(resourceId)) {
    return { state, ok: false, error: 'INVALID_RESOURCE_ID' };
  }

  if (!isValidQuantity(quantity)) {
    return { state, ok: false, error: 'INVALID_QUANTITY' };
  }

  const current = Object.hasOwn(state.resources, resourceId)
    ? state.resources[resourceId]
    : 0;

  const total = current + quantity;

  if (!Number.isSafeInteger(total)) {
    return { state, ok: false, error: 'INVALID_QUANTITY' };
  }

  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        [resourceId]: total,
      },
    },
    ok: true,
  };
}

export function removeResource(
  state: InventoryState,
  resourceId: string,
  quantity: number,
): InventoryTransition {
  if (!isValidId(resourceId)) {
    return { state, ok: false, error: 'INVALID_RESOURCE_ID' };
  }

  if (!isValidQuantity(quantity)) {
    return { state, ok: false, error: 'INVALID_QUANTITY' };
  }

  const current = Object.hasOwn(state.resources, resourceId)
    ? state.resources[resourceId]
    : 0;

  if (current < quantity) {
    return { state, ok: false, error: 'INSUFFICIENT_RESOURCE' };
  }

  const nextResources: Record<string, number> = {
    ...state.resources,
  };

  const remaining = current - quantity;

  if (remaining === 0) {
    delete nextResources[resourceId];
  } else {
    nextResources[resourceId] = remaining;
  }

  return {
    state: {
      ...state,
      resources: nextResources,
    },
    ok: true,
  };
}

export function craftFromInventory(
  state: InventoryState,
  recipeId: string,
  registry: RecipeRegistry,
): CraftingOutcome {
  return craft(state, recipeId, registry);
}
