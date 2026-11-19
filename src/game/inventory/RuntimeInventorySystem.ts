
export interface RuntimeInventoryState {
  resources: Readonly<Record<string, number>>;
}

export interface RuntimeInventoryTransition {
  state: RuntimeInventoryState;
  ok: boolean;
  error?: 'INVALID_RESOURCE_ID' | 'INVALID_QUANTITY' | 'INSUFFICIENT_RESOURCE';
}

export function createRuntimeInventory(): RuntimeInventoryState {
  return {
    resources: Object.create(null) as Record<string, number>,
  };
}

export function collectRuntimeResource(
  state: RuntimeInventoryState,
  resourceId: string,
): RuntimeInventoryTransition {
  if (
    typeof resourceId !== 'string' ||
    !resourceId.startsWith('crystal-') ||
    resourceId.trim() !== resourceId
  ) {
    return { state, ok: false, error: 'INVALID_RESOURCE_ID' };
  }

  const resources = Object.assign(
    Object.create(null),
    state.resources,
  ) as Record<string, number>;

  resources[resourceId] = (resources[resourceId] ?? 0) + 1;

  return {
    state: { resources },
    ok: true,
  };
}

export function removeRuntimeResource(
  state: RuntimeInventoryState,
  resourceId: string,
  quantity = 1,
): RuntimeInventoryTransition {
  if (
    typeof resourceId !== 'string' ||
    !resourceId.startsWith('crystal-') ||
    resourceId.trim() !== resourceId
  ) {
    return { state, ok: false, error: 'INVALID_RESOURCE_ID' };
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return { state, ok: false, error: 'INVALID_QUANTITY' };
  }

  const current = state.resources[resourceId] ?? 0;

  if (current < quantity) {
    return { state, ok: false, error: 'INSUFFICIENT_RESOURCE' };
  }

  const resources = Object.assign(
    Object.create(null),
    state.resources,
  ) as Record<string, number>;

  const remaining = current - quantity;

  if (remaining === 0) {
    delete resources[resourceId];
  } else {
    resources[resourceId] = remaining;
  }

  return {
    state: { resources },
    ok: true,
  };
}
