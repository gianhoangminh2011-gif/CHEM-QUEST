import {
  getReactionById,
} from "./ReactionEngine";

import {
  InventoryTransactionService,
  type InventoryTransactionResult,
} from "../inventory/InventoryTransactionService";

import type { RuntimeInventoryState } from "../inventory/RuntimeInventorySystem";

export type ReactionExecutionRequest = Readonly<{
  reactionId: string;
  transactionId: string;
  expectedRevision: number;
}>;

export type ReactionExecutionErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_REACTION_ID"
  | "REACTION_NOT_APPROVED"
  | "INVALID_TRANSACTION_ID"
  | "INVALID_REVISION"
  | "DUPLICATE_TRANSACTION_ID"
  | "TRANSACTION_ALREADY_ROLLED_BACK";

export type ReactionExecutionResult =
  | InventoryTransactionResult
  | {
      success: false;
      error: ReactionExecutionErrorCode;
      message: string;
    };

function failure(
  error: ReactionExecutionErrorCode,
  message: string,
): ReactionExecutionResult {
  return {
    success: false,
    error,
    message,
  };
}

function isValidIdentifier(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  ) {
    return false;
  }

  return (
    value !== "__proto__" &&
    value !== "prototype" &&
    !Object.prototype.hasOwnProperty.call(
      Object.prototype,
      value,
    )
  );
}

export class ReactionExecutionService {
  readonly #transactions: InventoryTransactionService;

  constructor(
    inventoryOrService:
      | RuntimeInventoryState
      | InventoryTransactionService,
    initialRevision = 0,
    storage?: Storage,
  ) {
    this.#transactions =
      inventoryOrService instanceof InventoryTransactionService
        ? inventoryOrService
        : new InventoryTransactionService(
            inventoryOrService,
            initialRevision,
            storage,
          );
  }

  getSnapshot() {
    return this.#transactions.getSnapshot();
  }

  prepare(
    request: ReactionExecutionRequest,
  ): ReactionExecutionResult {
    if (!request || typeof request !== "object") {
      return failure(
        "INVALID_REQUEST",
        "A reaction execution request is required.",
      );
    }

    if (!isValidIdentifier(request.reactionId)) {
      return failure(
        "INVALID_REACTION_ID",
        "Invalid reaction ID.",
      );
    }

    if (!isValidIdentifier(request.transactionId)) {
      return failure(
        "INVALID_TRANSACTION_ID",
        "Invalid transaction ID.",
      );
    }

    if (
      !Number.isSafeInteger(request.expectedRevision) ||
      request.expectedRevision < 0
    ) {
      return failure(
        "INVALID_REVISION",
        "Expected revision must be a non-negative safe integer.",
      );
    }

    const reaction = getReactionById(request.reactionId);

    if (!reaction) {
      return failure(
        "REACTION_NOT_APPROVED",
        "Reaction is unknown or has not been approved.",
      );
    }

    return this.#transactions.prepare(
      request.transactionId,
      reaction,
      request.expectedRevision,
    );
  }

  execute(
    reactionId: string,
    transactionId: string,
  ): ReactionExecutionResult {
    if (!isValidIdentifier(reactionId)) {
      return failure(
        "INVALID_REACTION_ID",
        "Invalid reaction ID.",
      );
    }

    if (!isValidIdentifier(transactionId)) {
      return failure(
        "INVALID_TRANSACTION_ID",
        "Invalid transaction ID.",
      );
    }

    const reaction = getReactionById(reactionId);

    if (!reaction) {
      return failure(
        "REACTION_NOT_APPROVED",
        "Reaction is unknown or has not been approved.",
      );
    }

    const existing = this.#transactions.getTransaction(
      transactionId,
    );

    if (existing) {
      if (existing.reactionId !== reaction.id) {
        return failure(
          "DUPLICATE_TRANSACTION_ID",
          "Transaction ID belongs to a different reaction.",
        );
      }

      if (existing.status === "ROLLED_BACK") {
        return failure(
          "TRANSACTION_ALREADY_ROLLED_BACK",
          "This reaction transaction was already rolled back.",
        );
      }

      // COMMITTED transactions remain idempotent.
      // PREPARED transactions resume through the same commit path.
      return this.#transactions.commit(transactionId);
    }

    const snapshot = this.#transactions.getSnapshot();

    const prepared = this.#transactions.prepare(
      transactionId,
      reaction,
      snapshot.revision,
    );

    if (!prepared.success) {
      return prepared;
    }

    if (prepared.record.status === "ROLLED_BACK") {
      return failure(
        "TRANSACTION_ALREADY_ROLLED_BACK",
        "This reaction transaction was already rolled back.",
      );
    }

    return this.#transactions.commit(transactionId);
  }

  commit(
    transactionId: string,
  ): InventoryTransactionResult {
    return this.#transactions.commit(transactionId);
  }

  rollback(
    transactionId: string,
  ): InventoryTransactionResult {
    return this.#transactions.rollback(transactionId);
  }
}