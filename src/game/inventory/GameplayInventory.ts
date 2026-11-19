
import {
  createInventoryState,
  collectResource,
  type InventoryState,
} from './InventorySystem';

/**
 * Builds the runtime inventory from collected gameplay resources.
 * Only approved crystal resource IDs are transferred.
 * Research samples are intentionally kept separate.
 */
export function buildGameplayInventory(
  collectedResourceIds: readonly string[],
): InventoryState {
  let inventory = createInventoryState();

  for (const resourceId of collectedResourceIds) {
    if (!resourceId.startsWith('crystal-')) {
      continue;
    }

    const transition = collectResource(
      inventory,
      resourceId,
    );

    if (transition.ok) {
      inventory = transition.state;
    }
  }

  return inventory;
}
