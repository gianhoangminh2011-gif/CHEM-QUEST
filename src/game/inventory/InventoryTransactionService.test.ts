
import { describe, expect, it } from "vitest";

import { InventoryTransactionService } from "./InventoryTransactionService";
import type { RuntimeInventoryState } from "./RuntimeInventorySystem";
import type { ReactionDefinition } from "../chemistry/ReactionEngine";

function createInventory(
  resources: Record<string, number> = {},
): RuntimeInventoryState {
  return { resources };
}

const reaction: ReactionDefinition = {
  id: "test-reaction",
  inputs: [{ resourceId: "crystal-water", quantity: 2 }],
  outputs: [{ resourceId: "crystal-steam", quantity: 1 }],
};

describe("InventoryTransactionService", () => {
  it("prepares without mutating inventory or revision", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    const result = service.prepare("tx-001", reaction);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.record.status).toBe("PREPARED");
    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 3 },
      },
      revision: 0,
    });
  });

  it("commits once and makes repeated commit idempotent", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    const prepared = service.prepare("tx-002", reaction);
    expect(prepared.success).toBe(true);

    const firstCommit = service.commit("tx-002");
    expect(firstCommit.success).toBe(true);

    const secondCommit = service.commit("tx-002");
    expect(secondCommit.success).toBe(true);

    if (!firstCommit.success || !secondCommit.success) return;

    expect(firstCommit.record.status).toBe("COMMITTED");
    expect(secondCommit.revision).toBe(1);
    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 1,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });
  });

  it("rejects insufficient materials without changing state", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 1 }),
    );

    const result = service.prepare("tx-003", reaction);

    expect(result).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });

    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: { "crystal-water": 1 },
      },
      revision: 0,
    });
  });

  it("rolls back a prepared transaction without changing inventory", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    const prepared = service.prepare("tx-004", reaction);
    expect(prepared.success).toBe(true);

    const rolledBack = service.rollback("tx-004");

    expect(rolledBack.success).toBe(true);
    if (!rolledBack.success) return;

    expect(rolledBack.record.status).toBe("ROLLED_BACK");
    expect(service.commit("tx-004")).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_ROLLED_BACK",
    });

    expect(service.getSnapshot().revision).toBe(0);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 3,
    });
  });

  it("rejects a second prepared transaction after revision changes", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 5 }),
    );

    const first = service.prepare("tx-005", reaction);
    const second = service.prepare("tx-006", reaction);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    const firstCommit = service.commit("tx-005");
    expect(firstCommit.success).toBe(true);

    const secondCommit = service.commit("tx-006");

    expect(secondCommit).toMatchObject({
      success: false,
      error: "REVISION_CONFLICT",
    });

    expect(service.getSnapshot().revision).toBe(1);
    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 3,
      "crystal-steam": 1,
    });
  });

  it("rejects reuse of a transaction ID for a different reaction", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    expect(service.prepare("tx-007", reaction).success).toBe(true);

    const differentReaction: ReactionDefinition = {
      id: "different-reaction",
      inputs: [{ resourceId: "crystal-water", quantity: 1 }],
      outputs: [{ resourceId: "crystal-steam", quantity: 1 }],
    };

    expect(
      service.prepare("tx-007", differentReaction),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });
  });

  it("rejects non-crystal material IDs", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    const invalidReaction: ReactionDefinition = {
      id: "invalid-reaction",
      inputs: [{ resourceId: "water", quantity: 1 }],
      outputs: [{ resourceId: "crystal-steam", quantity: 1 }],
    };

    expect(
      service.prepare("tx-008", invalidReaction),
    ).toMatchObject({
      success: false,
      error: "INVALID_MATERIAL_ID",
    });
  });

  it("does not allow rollback after commit", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    service.prepare("tx-009", reaction);
    service.commit("tx-009");

    expect(service.rollback("tx-009")).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_COMMITTED",
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("rejects the same transaction ID with a different expected revision", () => {
    const service = new InventoryTransactionService(
      createInventory({ "crystal-water": 3 }),
    );

    expect(
      service.prepare("tx-010", reaction, 0).success,
    ).toBe(true);

    expect(
      service.prepare("tx-010", reaction, 1),
    ).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });
});
