import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ReactionEngine", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./ReactionEngine")>();

  return {
    ...actual,
    getReactionById: vi.fn(),
  };
});

import {
  getReactionById,
  type ReactionDefinition,
} from "./ReactionEngine";

import {
  ReactionExecutionService,
} from "./ReactionExecutionService";

import {
  InventoryTransactionService,
} from "../inventory/InventoryTransactionService";

import type { RuntimeInventoryState } from "../inventory/RuntimeInventorySystem";

const mockedGetReactionById = vi.mocked(getReactionById);

class MemoryStorage implements Storage {
  #data = new Map<string, string>();

  get length(): number {
    return this.#data.size;
  }

  clear(): void {
    this.#data.clear();
  }

  getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.#data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#data.set(key, String(value));
  }
}

const approvedReaction: ReactionDefinition = {
  id: "approved-test-reaction",
  inputs: [
    { resourceId: "crystal-water", quantity: 2 },
  ],
  outputs: [
    { resourceId: "crystal-steam", quantity: 1 },
  ],
};

const anotherApprovedReaction: ReactionDefinition = {
  id: "another-approved-reaction",
  inputs: [
    { resourceId: "crystal-water", quantity: 1 },
  ],
  outputs: [
    { resourceId: "crystal-steam", quantity: 2 },
  ],
};

function createInventory(
  resources: Record<string, number> = {},
): RuntimeInventoryState {
  return { resources };
}

function createService(
  resources: Record<string, number> = {
    "crystal-water": 5,
  },
  revision = 0,
  storage: Storage = new MemoryStorage(),
): ReactionExecutionService {
  return new ReactionExecutionService(
    createInventory(resources),
    revision,
    storage,
  );
}

function createRequest(
  transactionId = "tx-wp04-001",
  expectedRevision = 0,
) {
  return {
    reactionId: approvedReaction.id,
    transactionId,
    expectedRevision,
  };
}

describe("ReactionExecutionService", () => {
  beforeEach(() => {
    mockedGetReactionById.mockReset();
    mockedGetReactionById.mockReturnValue(undefined);
  });

  it("prepares an approved reaction by ID", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();
    const before = service.getSnapshot();

    const result = service.prepare(createRequest());

    expect(mockedGetReactionById).toHaveBeenCalledWith(
      approvedReaction.id,
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.record.status).toBe("PREPARED");
    expect(result.record.reactionId).toBe(approvedReaction.id);

    expect(service.getSnapshot()).toEqual(before);
  });

  it("rejects unknown or unapproved reactions", () => {
    const service = createService();
    const before = service.getSnapshot();

    const result = service.prepare(createRequest());

    expect(result).toMatchObject({
      success: false,
      error: "REACTION_NOT_APPROVED",
    });

    expect(service.getSnapshot()).toEqual(before);
  });

  it("rejects invalid reaction IDs before registry lookup", () => {
    const service = createService();

    const result = service.prepare({
      ...createRequest(),
      reactionId: "__proto__",
    });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_REACTION_ID",
    });

    expect(mockedGetReactionById).not.toHaveBeenCalled();
  });

  it("rejects invalid expected revisions", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    const result = service.prepare({
      ...createRequest(),
      expectedRevision: -1,
    });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_REVISION",
    });

    expect(mockedGetReactionById).not.toHaveBeenCalled();
  });

  it("does not mutate inventory when materials are insufficient", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService({
      "crystal-water": 1,
    });

    const before = service.getSnapshot();

    const result = service.prepare(createRequest());

    expect(result).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });

    expect(service.getSnapshot()).toEqual(before);
  });

  it("prepares and commits an approved reaction", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    const prepared = service.prepare(createRequest());

    expect(prepared.success).toBe(true);

    const committed = service.commit("tx-wp04-001");

    expect(committed.success).toBe(true);

    if (!committed.success) return;

    expect(committed.record.status).toBe("COMMITTED");
    expect(committed.revision).toBe(1);

    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 3,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });
  });

  it("keeps repeated commits idempotent", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    service.prepare(createRequest());

    const first = service.commit("tx-wp04-001");
    const second = service.commit("tx-wp04-001");

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(service.getSnapshot().revision).toBe(1);
  });

  it("executes an approved reaction and updates inventory", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    const result = service.execute(
      approvedReaction.id,
      "tx-execute-001",
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.record.status).toBe("COMMITTED");
    expect(result.revision).toBe(1);

    expect(service.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 3,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });
  });

  it("keeps execute idempotent when the same transaction is repeated", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    const first = service.execute(
      approvedReaction.id,
      "tx-execute-repeat",
    );

    const snapshotAfterFirst = service.getSnapshot();

    const second = service.execute(
      approvedReaction.id,
      "tx-execute-repeat",
    );

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    expect(service.getSnapshot()).toEqual(snapshotAfterFirst);
    expect(service.getSnapshot().revision).toBe(1);

    expect(service.getSnapshot().inventory.resources).toEqual({
      "crystal-water": 3,
      "crystal-steam": 1,
    });
  });

  it("rejects reuse of an executed transaction ID for another reaction", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    const first = service.execute(
      approvedReaction.id,
      "tx-execute-duplicate",
    );

    expect(first.success).toBe(true);

    const snapshotAfterFirst = service.getSnapshot();

    mockedGetReactionById.mockReturnValue(
      anotherApprovedReaction,
    );

    const second = service.execute(
      anotherApprovedReaction.id,
      "tx-execute-duplicate",
    );

    expect(second).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });

    expect(service.getSnapshot()).toEqual(snapshotAfterFirst);
  });

  it("does not execute a reaction that is not approved", () => {
    const service = createService();
    const before = service.getSnapshot();

    const result = service.execute(
      approvedReaction.id,
      "tx-unapproved-001",
    );

    expect(result).toMatchObject({
      success: false,
      error: "REACTION_NOT_APPROVED",
    });

    expect(service.getSnapshot()).toEqual(before);
  });

  it("does not mutate inventory when execute has insufficient materials", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService({
      "crystal-water": 1,
    });

    const before = service.getSnapshot();

    const result = service.execute(
      approvedReaction.id,
      "tx-insufficient-001",
    );

    expect(result).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });

    expect(service.getSnapshot()).toEqual(before);
  });

  it("does not execute a transaction that was already rolled back", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    const prepared = service.prepare(
      createRequest("tx-rolled-back-001"),
    );

    expect(prepared.success).toBe(true);

    const rolledBack = service.rollback(
      "tx-rolled-back-001",
    );

    expect(rolledBack.success).toBe(true);

    const before = service.getSnapshot();

    const result = service.execute(
      approvedReaction.id,
      "tx-rolled-back-001",
    );

    expect(result).toMatchObject({
      success: false,
      error: "TRANSACTION_ALREADY_ROLLED_BACK",
    });

    expect(service.getSnapshot()).toEqual(before);
  });

  it("reuses the existing InventoryTransactionService instance", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const transactions = new InventoryTransactionService(
      createInventory({
        "crystal-water": 5,
      }),
      0,
      new MemoryStorage(),
    );

    const service = new ReactionExecutionService(transactions);

    expect(service.getSnapshot()).toEqual(
      transactions.getSnapshot(),
    );

    const result = service.execute(
      approvedReaction.id,
      "tx-shared-service-001",
    );

    expect(result.success).toBe(true);

    expect(service.getSnapshot()).toEqual(
      transactions.getSnapshot(),
    );

    expect(transactions.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 3,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });
  });

  it("rolls back a prepared transaction without changing inventory", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();
    const before = service.getSnapshot();

    service.prepare(createRequest());

    const result = service.rollback("tx-wp04-001");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.record.status).toBe("ROLLED_BACK");
    expect(service.getSnapshot()).toEqual(before);
  });

  it("rejects reuse of a transaction ID for another reaction", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    expect(service.prepare(createRequest()).success).toBe(true);

    mockedGetReactionById.mockReturnValue(
      anotherApprovedReaction,
    );

    const result = service.prepare({
      reactionId: anotherApprovedReaction.id,
      transactionId: "tx-wp04-001",
      expectedRevision: 0,
    });

    expect(result).toMatchObject({
      success: false,
      error: "DUPLICATE_TRANSACTION_ID",
    });

    expect(service.getSnapshot().revision).toBe(0);
  });

  it("rejects commit when inventory revision has changed", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const service = createService();

    expect(
      service.prepare(createRequest("tx-wp04-a", 0)).success,
    ).toBe(true);

    expect(
      service.prepare(createRequest("tx-wp04-b", 0)).success,
    ).toBe(true);

    expect(service.commit("tx-wp04-a").success).toBe(true);

    const secondCommit = service.commit("tx-wp04-b");

    expect(secondCommit).toMatchObject({
      success: false,
      error: "REVISION_CONFLICT",
    });

    expect(service.getSnapshot().revision).toBe(1);
  });

  it("does not expose the internal transaction service at runtime", () => {
    const service = createService();

    expect(service).not.toHaveProperty("transactions");
    expect(service).not.toHaveProperty("#transactions");
    expect(service).not.toHaveProperty("applyReaction");

    expect(Object.keys(service)).not.toContain("transactions");
    expect(Object.getOwnPropertySymbols(service)).toHaveLength(0);
  });

  it("restores committed transactions after service recreation", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const storage = new MemoryStorage();

    const firstService = createService(
      { "crystal-water": 5 },
      0,
      storage,
    );

    expect(
      firstService.prepare(createRequest("tx-durable-commit")).success,
    ).toBe(true);

    expect(
      firstService.commit("tx-durable-commit").success,
    ).toBe(true);

    const secondService = createService(
      {},
      0,
      storage,
    );

    expect(secondService.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 3,
          "crystal-steam": 1,
        },
      },
      revision: 1,
    });

    const repeatedCommit = secondService.commit(
      "tx-durable-commit",
    );

    expect(repeatedCommit.success).toBe(true);

    if (!repeatedCommit.success) return;

    expect(repeatedCommit.record.status).toBe("COMMITTED");
    expect(secondService.getSnapshot().revision).toBe(1);
  });

  it("recovers an interrupted prepared transaction as rolled back", () => {
    mockedGetReactionById.mockReturnValue(approvedReaction);

    const storage = new MemoryStorage();

    const firstService = createService(
      { "crystal-water": 5 },
      0,
      storage,
    );

    expect(
      firstService.prepare(createRequest("tx-durable-prepared")).success,
    ).toBe(true);

    const recoveredService = createService(
      {},
      0,
      storage,
    );

    const result = recoveredService.rollback(
      "tx-durable-prepared",
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.record.status).toBe("ROLLED_BACK");
    expect(recoveredService.getSnapshot()).toEqual({
      inventory: {
        resources: {
          "crystal-water": 5,
        },
      },
      revision: 0,
    });
  });
});