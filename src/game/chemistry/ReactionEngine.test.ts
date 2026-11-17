
import { describe, expect, it } from "vitest";
import {
  applyReaction,
  getReactionById,
  REACTION_REGISTRY,
  type ReactionDefinition,
} from "./ReactionEngine";

describe("ReactionEngine", () => {
  const validReaction: ReactionDefinition = {
    id: "test-reaction",
    inputs: [{ resourceId: "water", quantity: 2 }],
    outputs: [{ resourceId: "hydrogen", quantity: 2 }],
  };

  it("applies a valid reaction", () => {
    const result = applyReaction(validReaction, {
      water: 5,
      oxygen: 3,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.reactionId).toBe("test-reaction");
      expect(result.inventory).toEqual({
        water: 3,
        oxygen: 3,
        hydrogen: 2,
      });
    }
  });

  it("does not mutate the original inventory", () => {
    const inventory = { water: 5 };

    applyReaction(validReaction, inventory);

    expect(inventory).toEqual({ water: 5 });
  });

  it("rejects insufficient resources", () => {
    const result = applyReaction(validReaction, { water: 1 });

    expect(result).toMatchObject({
      success: false,
      error: "INSUFFICIENT_RESOURCES",
    });
  });

  it("rejects an invalid reaction ID", () => {
    const reaction = {
      ...validReaction,
      id: " ",
    } as ReactionDefinition;

    const result = applyReaction(reaction, { water: 5 });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_REACTION",
    });
  });

  it("rejects invalid input quantities", () => {
    const reaction = {
      ...validReaction,
      inputs: [{ resourceId: "water", quantity: 0 }],
    } as ReactionDefinition;

    const result = applyReaction(reaction, { water: 5 });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_QUANTITY",
    });
  });

  it("rejects fractional quantities", () => {
    const reaction = {
      ...validReaction,
      inputs: [{ resourceId: "water", quantity: 1.5 }],
    } as ReactionDefinition;

    const result = applyReaction(reaction, { water: 5 });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_QUANTITY",
    });
  });

  it("rejects duplicate input resource IDs", () => {
    const reaction: ReactionDefinition = {
      ...validReaction,
      inputs: [
        { resourceId: "water", quantity: 1 },
        { resourceId: "water", quantity: 1 },
      ],
    };

    const result = applyReaction(reaction, { water: 5 });

    expect(result).toMatchObject({
      success: false,
      error: "DUPLICATE_RESOURCE",
    });
  });

  it("rejects duplicate output resource IDs", () => {
    const reaction: ReactionDefinition = {
      ...validReaction,
      outputs: [
        { resourceId: "hydrogen", quantity: 1 },
        { resourceId: "hydrogen", quantity: 1 },
      ],
    };

    const result = applyReaction(reaction, { water: 5 });

    expect(result).toMatchObject({
      success: false,
      error: "DUPLICATE_RESOURCE",
    });
  });

  it("rejects invalid inventory quantities", () => {
    const result = applyReaction(validReaction, {
      water: -1,
    });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_INVENTORY",
    });
  });

  it("rejects unsafe inventory quantities", () => {
    const result = applyReaction(validReaction, {
      water: Number.MAX_SAFE_INTEGER + 1,
    });

    expect(result).toMatchObject({
      success: false,
      error: "INVALID_INVENTORY",
    });
  });

  it("rejects output quantity overflow", () => {
    const reaction: ReactionDefinition = {
      id: "overflow-test",
      inputs: [{ resourceId: "water", quantity: 1 }],
      outputs: [{ resourceId: "hydrogen", quantity: 2 }],
    };

    const result = applyReaction(reaction, {
      water: 1,
      hydrogen: Number.MAX_SAFE_INTEGER,
    });

    expect(result).toMatchObject({
      success: false,
      error: "QUANTITY_OVERFLOW",
    });
  });

  it("allows an output to use the same resource ID as an input", () => {
    const reaction: ReactionDefinition = {
      id: "same-resource-test",
      inputs: [{ resourceId: "crystal", quantity: 2 }],
      outputs: [{ resourceId: "crystal", quantity: 5 }],
    };

    const result = applyReaction(reaction, { crystal: 4 });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.inventory.crystal).toBe(7);
    }
  });

  it("does not expose unverified reactions in the registry", () => {
    expect(REACTION_REGISTRY).toEqual([]);
    expect(getReactionById("test-reaction")).toBeUndefined();
  });

  it("returns an immutable result inventory", () => {
    const result = applyReaction(validReaction, { water: 5 });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(Object.isFrozen(result.inventory)).toBe(true);
    }
  });
});
