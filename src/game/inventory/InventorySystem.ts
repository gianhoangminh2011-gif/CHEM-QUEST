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
  | 'INVALID_INVENTORY'
  | 'INSUFFICIENT_RESOURCE';

export interface InventoryTransition {
  readonly state: InventoryState;
  readonly ok: boolean;
  readonly error?: InventoryError;
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
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

function isValidCount(quantity: unknown): boolean {
  return (
    typeof quantity === 'number' &&
    Number.isSafeInteger(quantity) &&
    quantity >= 0
  );
}

/** Creates a null-prototype map safe for IDs such as "__proto__". */
function createResourceMap(
  source?: InventoryCounts,
): Record<string, number> {
  const result = Object.create(null) as Record<string, number>;

  if (source) {
    for (const [id, quantity] of Object.entries(source)) {
      Object.defineProperty(result, id, {
        value: quantity,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }

  return result;
}

function validateInventory(state: InventoryState): boolean {
  if (
    !state ||
    typeof state !== 'object' ||
    !state.resources ||
    typeof state.resources !== 'object' ||
    Array.isArray(state.resources) ||
    !Array.isArray(state.craftedRecipeIds)
  ) {
    return false;
  }

  for (const [id, quantity] of Object.entries(state.resources)) {
    if (!isValidId(id) || !isValidCount(quantity)) {
      return false;
    }
  }

  const seen = new Set<string>();

  for (const id of state.craftedRecipeIds) {
    if (!isValidId(id) || seen.has(id)) {
      return false;
    }

    seen.add(id);
  }

  return true;
}

function fail(
  state: InventoryState,
  error: InventoryError,
): InventoryTransition {
  return { state, ok: false, error };
}

export function createInventoryState(): InventoryState {
  return {
    resources: createResourceMap(),
    craftedRecipeIds: [],
  };
}

export function collectResource(
  state: InventoryState,
  resourceId: string,
  quantity = 1,
): InventoryTransition {
  if (!isValidId(resourceId)) {
    return fail(state, 'INVALID_RESOURCE_ID');
  }

  if (!isValidQuantity(quantity)) {
    return fail(state, 'INVALID_QUANTITY');
  }

  if (!validateInventory(state)) {
    return fail(state, 'INVALID_INVENTORY');
  }

  const current = hasOwn(state.resources, resourceId)
    ? state.resources[resourceId]
    : 0;

  const total = current + quantity;

  if (!Number.isSafeInteger(total)) {
    return fail(state, 'INVALID_QUANTITY');
  }

  const nextResources = createResourceMap(state.resources);
  nextResources[resourceId] = total;

  return {
    state: {
      ...state,
      resources: nextResources,
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
    return fail(state, 'INVALID_RESOURCE_ID');
  }

  if (!isValidQuantity(quantity)) {
    return fail(state, 'INVALID_QUANTITY');
  }

  if (!validateInventory(state)) {
    return fail(state, 'INVALID_INVENTORY');
  }

  const current = hasOwn(state.resources, resourceId)
    ? state.resources[resourceId]
    : 0;

  if (current < quantity) {
    return fail(state, 'INSUFFICIENT_RESOURCE');
  }

  const nextResources = createResourceMap(state.resources);
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