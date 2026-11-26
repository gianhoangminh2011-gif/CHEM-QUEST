
import { describe, expect, it } from "vitest";

import {
  AFFINITY_LEVELS,
  CULTIVATION_REALMS,
} from "./CreatureRealmContracts";

import {
  evaluateEvolutionRequirements,
  type EvolutionRequirementEvaluationContext,
} from "./EvolutionRequirementEvaluator";

function makeContext(
  overrides: Partial<EvolutionRequirementEvaluationContext> = {},
): EvolutionRequirementEvaluationContext {
  return {
    level: 15,
    cultivationRealm: "NGUYEN_TO_CANH",
    inventory: [
      { itemId: "ITEM-001", quantity: 5 },
    ],
    completedQuestIds: ["QUEST-001"],
    affinities: [
      { elementId: "ELEMENT-001", level: "CONG_HUONG" },
    ],
    ...overrides,
  };
}

describe("evaluateEvolutionRequirements", () => {
  it("evaluates all five supported requirement types as met", () => {
    const result = evaluateEvolutionRequirements(
      [
        "LEVEL>=10",
        "REALM>=KHAI_VAT_CANH",
        "ITEM:ITEM-001>=2",
        "QUEST:QUEST-001=COMPLETED",
        "AFFINITY:ELEMENT-001>=TUONG_HOP",
      ],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(true);
    expect(result.inputErrors).toHaveLength(0);
    expect(result.evaluations).toHaveLength(5);
    expect(result.evaluations.every((entry) => entry.met)).toBe(true);
  });

  it("evaluates LEVEL using a greater-than-or-equal comparison", () => {
    const result = evaluateEvolutionRequirements(
      ["LEVEL>=15", "LEVEL>=16"],
      makeContext({ level: 15 }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.evaluations.map((entry) => entry.met)).toEqual([
      true,
      false,
    ]);
  });

  it("evaluates cultivation realms by their declared order", () => {
    const result = evaluateEvolutionRequirements(
      [
        "REALM>=KHAI_VAT_CANH",
        "REALM>=NGUYEN_TO_CANH",
        "REALM>=NGUYEN_TU_CANH",
      ],
      makeContext({ cultivationRealm: "NGUYEN_TO_CANH" }),
    );

    expect(result.evaluations.map((entry) => entry.met)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("evaluates inventory quantities without consuming items", () => {
    const context = makeContext({
      inventory: [
        { itemId: "ITEM-001", quantity: 2 },
      ],
    });
    const original = JSON.stringify(context);

    const result = evaluateEvolutionRequirements(
      [
        "ITEM:ITEM-001>=2",
        "ITEM:ITEM-001>=3",
        "ITEM:ITEM-999>=1",
      ],
      context,
    );

    expect(result.evaluations.map((entry) => entry.met)).toEqual([
      true,
      false,
      false,
    ]);
    expect(JSON.stringify(context)).toBe(original);
  });

  it("checks quest completion by exact quest ID", () => {
    const result = evaluateEvolutionRequirements(
      [
        "QUEST:QUEST-001=COMPLETED",
        "QUEST:QUEST-002=COMPLETED",
      ],
      makeContext(),
    );

    expect(result.evaluations.map((entry) => entry.met)).toEqual([
      true,
      false,
    ]);
  });

  it("evaluates affinity using the declared affinity order", () => {
    const result = evaluateEvolutionRequirements(
      [
        "AFFINITY:ELEMENT-001>=SO_CAM",
        "AFFINITY:ELEMENT-001>=CONG_HUONG",
        "AFFINITY:ELEMENT-001>=BAN_NGUYEN",
        "AFFINITY:ELEMENT-999>=VO_CAM",
      ],
      makeContext(),
    );

    expect(result.evaluations.map((entry) => entry.met)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it("requires every requirement to pass", () => {
    const result = evaluateEvolutionRequirements(
      [
        "LEVEL>=10",
        "QUEST:QUEST-999=COMPLETED",
      ],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.evaluations.every((entry) => entry.met)).toBe(false);
  });

  it("accepts whitespace around operators", () => {
    const result = evaluateEvolutionRequirements(
      [
        "LEVEL >= 10",
        "ITEM:ITEM-001 >= 2",
        "QUEST:QUEST-001 = COMPLETED",
      ],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(true);
    expect(result.inputErrors).toHaveLength(0);
  });

  it("rejects an empty requirements array", () => {
    const result = evaluateEvolutionRequirements(
      [],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors[0].code).toBe("EMPTY_REQUIREMENTS");
  });

  it("rejects a non-array requirements input", () => {
    const result = evaluateEvolutionRequirements(
      "LEVEL>=10" as unknown as readonly string[],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors[0].code).toBe("INVALID_REQUIREMENTS");
  });

  it("reports malformed and unsupported requirements", () => {
    const result = evaluateEvolutionRequirements(
      [
        "LEVEL=10",
        "GOLD>=100",
        "QUEST:QUEST-001=IN_PROGRESS",
      ],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors.map((entry) => entry.code)).toEqual([
      "MALFORMED_REQUIREMENT",
      "UNKNOWN_REQUIREMENT_TYPE",
      "INVALID_REQUIREMENT_VALUE",
    ]);
  });

  it("rejects duplicate requirements after normalization", () => {
    const result = evaluateEvolutionRequirements(
      [
        "LEVEL>=10",
        "LEVEL >= 10",
      ],
      makeContext(),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_REQUIREMENT",
          path: "requirements[1]",
        }),
      ]),
    );
  });

  it("rejects a missing evaluation context", () => {
    const result = evaluateEvolutionRequirements(
      ["LEVEL>=10"],
      undefined,
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_CONTEXT",
        }),
      ]),
    );
  });

  it("rejects invalid level values", () => {
    const result = evaluateEvolutionRequirements(
      ["LEVEL>=10"],
      makeContext({ level: 0 }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_LEVEL",
          path: "context.level",
        }),
      ]),
    );
  });

  it("rejects an unknown cultivation realm", () => {
    const result = evaluateEvolutionRequirements(
      ["LEVEL>=10"],
      {
        ...makeContext(),
        cultivationRealm: "UNKNOWN_REALM",
      },
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_REALM",
        }),
      ]),
    );
  });

  it("rejects malformed inventory entries", () => {
    const result = evaluateEvolutionRequirements(
      ["ITEM:ITEM-001>=1"],
      makeContext({
        inventory: [
          { itemId: "ITEM-001", quantity: -1 },
        ],
      }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_ITEM_QUANTITY",
        }),
      ]),
    );
  });

  it("rejects duplicate inventory item IDs", () => {
    const result = evaluateEvolutionRequirements(
      ["ITEM:ITEM-001>=1"],
      makeContext({
        inventory: [
          { itemId: "ITEM-001", quantity: 1 },
          { itemId: "ITEM-001", quantity: 2 },
        ],
      }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_INVENTORY_ITEM",
        }),
      ]),
    );
  });

  it("rejects invalid completed quest IDs", () => {
    const result = evaluateEvolutionRequirements(
      ["QUEST:QUEST-001=COMPLETED"],
      makeContext({
        completedQuestIds: ["invalid id"],
      }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_QUEST_ID",
        }),
      ]),
    );
  });

  it("rejects duplicate completed quest IDs", () => {
    const result = evaluateEvolutionRequirements(
      ["QUEST:QUEST-001=COMPLETED"],
      makeContext({
        completedQuestIds: ["QUEST-001", "QUEST-001"],
      }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_COMPLETED_QUEST",
        }),
      ]),
    );
  });

  it("rejects invalid affinity levels", () => {
    const result = evaluateEvolutionRequirements(
      ["AFFINITY:ELEMENT-001>=SO_CAM"],
      {
        ...makeContext(),
        affinities: [
          {
            elementId: "ELEMENT-001",
            level: "UNKNOWN" as (typeof AFFINITY_LEVELS)[number],
          },
        ],
      },
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_AFFINITY_LEVEL",
        }),
      ]),
    );
  });

  it("rejects duplicate affinity element IDs", () => {
    const result = evaluateEvolutionRequirements(
      ["AFFINITY:ELEMENT-001>=SO_CAM"],
      makeContext({
        affinities: [
          { elementId: "ELEMENT-001", level: "SO_CAM" },
          { elementId: "ELEMENT-001", level: "TUONG_HOP" },
        ],
      }),
    );

    expect(result.requirementsMet).toBe(false);
    expect(result.inputErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_AFFINITY",
        }),
      ]),
    );
  });

  it("returns immutable results and entries", () => {
    const result = evaluateEvolutionRequirements(
      ["LEVEL>=10"],
      makeContext(),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evaluations)).toBe(true);
    expect(Object.isFrozen(result.evaluations[0])).toBe(true);
    expect(Object.isFrozen(result.inputErrors)).toBe(true);
  });

  it("does not mutate the context or requirements", () => {
    const context = makeContext();
    const requirements = [
      "LEVEL>=10",
      "ITEM:ITEM-001>=2",
    ];
    const originalContext = JSON.stringify(context);
    const originalRequirements = JSON.stringify(requirements);

    evaluateEvolutionRequirements(requirements, context);

    expect(JSON.stringify(context)).toBe(originalContext);
    expect(JSON.stringify(requirements)).toBe(originalRequirements);
  });

  it("returns evaluation details for each valid requirement", () => {
    const result = evaluateEvolutionRequirements(
      ["LEVEL>=10"],
      makeContext(),
    );

    expect(result.evaluations[0]).toEqual({
      requirement: "LEVEL>=10",
      normalized: "LEVEL>=10",
      type: "LEVEL",
      met: true,
    });
  });

  it("uses the declared contract ordering for realm and affinity values", () => {
    expect(CULTIVATION_REALMS.indexOf("NGUYEN_TO_CANH")).toBeGreaterThan(
      CULTIVATION_REALMS.indexOf("KHAI_VAT_CANH"),
    );

    expect(AFFINITY_LEVELS.indexOf("CONG_HUONG")).toBeGreaterThan(
      AFFINITY_LEVELS.indexOf("TUONG_HOP"),
    );
  });
});
