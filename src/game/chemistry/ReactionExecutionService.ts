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
  | "REVISION_CONFLICT"
  | "DUPLICATE_TRANSACTION_ID"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_ALREADY_ROLLED_BACK"
  | "TRANSACTION_ALREADY_COMMITTED"
  | "INVALID_MATERIAL_ID"
  | "INVALID_INVENTORY"
  | "REVISION_OVERFLOW"
  | "INVALID_REACTION"
  | "INSUFFICIENT_RESOURCES"
  | "INVALID_QUANTITY"
  | "DUPLICATE_RESOURCE"
  | "QUANTITY_OVERFLOW";

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
  return { success: false, error, message };
}

function isValidReactionId(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
  ) {
    return false;
  }

  return (
    value !== "__proto__" &&
    value !== "prototype" &&
    !Object.prototype.hasOwnProperty.call(Object.prototype, value)
  );
}

export class ReactionExecutionService {
  readonly #transactions: InventoryTransactionService;

  constructor(
    initialInventory: RuntimeInventoryState,
    initialRevision = 0,
  ) {
    this.#transactions = new InventoryTransactionService(
      initialInventory,
      initialRevision,
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

    if (!isValidReactionId(request.reactionId)) {
      return failure(
        "INVALID_REACTION_ID",
        "Invalid reaction ID.",
      );
    }

    if (
      typeof request.transactionId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(request.transactionId)
    ) {
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
