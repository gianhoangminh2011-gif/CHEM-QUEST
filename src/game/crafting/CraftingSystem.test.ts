import { describe, expect, it } from 'vitest';
import {
  CRAFTING_RECIPES,
  craft,
  validateRecipe,
  type CraftingRecipe,
  type CraftingState,
  type RecipeRegistry,
} from './CraftingSystem';

// TEST FIXTURES ONLY — ID trung tính, không phải dữ liệu game/hóa học.
const makeRecipe = (over: Partial<CraftingRecipe> = {}): CraftingRecipe => ({
  id: 'test_recipe',
  ingredients: [
    { resourceId: 'test_a', quantity: 2 },
    { resourceId: 'test_b', quantity: 1 },
  ],
  output: { resourceId: 'test_out', quantity: 1 },
  ...over,
});
const reg = (r: CraftingRecipe): RecipeRegistry => ({ [r.id]: r });
const makeState = (
  resources: Record<string, number>,
  craftedRecipeIds: string[] = [],
): CraftingState => ({ resources, craftedRecipeIds });

describe('validateRecipe', () => {
  it('accepts a valid recipe', () => {
    expect(validateRecipe(makeRecipe())).toBeNull();
  });
  it('rejects empty ids', () => {
    expect(validateRecipe(makeRecipe({ id: '  ' }))).not.toBeNull();
    expect(
      validateRecipe(makeRecipe({ ingredients: [{ resourceId: '', quantity: 1 }] })),
    ).not.toBeNull();
    expect(
      validateRecipe(makeRecipe({ output: { resourceId: '', quantity: 1 } })),
    ).not.toBeNull();
  });
  it('rejects empty ingredient list', () => {
    expect(validateRecipe(makeRecipe({ ingredients: [] }))).not.toBeNull();
  });
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid quantity %s',
    (q) => {
      expect(
        validateRecipe(makeRecipe({ ingredients: [{ resourceId: 'test_a', quantity: q }] })),
      ).not.toBeNull();
      expect(
        validateRecipe(makeRecipe({ output: { resourceId: 'test_out', quantity: q } })),
      ).not.toBeNull();
    },
  );
  it('rejects duplicate ingredient ids', () => {
    const r = makeRecipe({
      ingredients: [
        { resourceId: 'test_a', quantity: 1 },
        { resourceId: 'test_a', quantity: 1 },
      ],
    });
    expect(validateRecipe(r)).not.toBeNull();
  });
});

describe('craft', () => {
  it('rejects every recipe when the default registry is empty', () => {
    expect(Object.keys(CRAFTING_RECIPES)).toHaveLength(0);
    const out = craft(makeState({ test_a: 9 }), 'test_recipe');
    expect(out.result).toMatchObject({ ok: false, error: 'UNKNOWN_RECIPE' });
  });

  it('rejects prototype keys as unknown recipes', () => {
    const out = craft(makeState({}), 'toString', reg(makeRecipe()));
    expect(out.result).toMatchObject({ ok: false, error: 'UNKNOWN_RECIPE' });
  });

  it('rejects an invalid recipe in the registry', () => {
    const bad = makeRecipe({ ingredients: [] });
    const out = craft(makeState({ test_a: 9 }), bad.id, reg(bad));
    expect(out.result).toMatchObject({ ok: false, error: 'INVALID_RECIPE' });
  });

  it('rejects when an ingredient is missing or short', () => {
    const r = makeRecipe();
    const missing = craft(makeState({ test_a: 2 }), r.id, reg(r));
    expect(missing.result).toMatchObject({ ok: false, error: 'INSUFFICIENT_INGREDIENTS' });
    const short = craft(makeState({ test_a: 1, test_b: 1 }), r.id, reg(r));
    expect(short.result).toMatchObject({ ok: false, error: 'INSUFFICIENT_INGREDIENTS' });
  });

  it('crafts successfully, consumes ingredients and adds output', () => {
    const r = makeRecipe();
    const out = craft(makeState({ test_a: 5, test_b: 1, test_unused: 7 }), r.id, reg(r));
    expect(out.result).toEqual({
      ok: true,
      recipeId: 'test_recipe',
      produced: { resourceId: 'test_out', quantity: 1 },
    });
    expect(out.state.resources).toEqual({ test_a: 3, test_unused: 7, test_out: 1 });
  });

  it('preserves unused resources and stacks existing output', () => {
    const r = makeRecipe();
    const out = craft(makeState({ test_a: 2, test_b: 1, test_out: 4, test_x: 1 }), r.id, reg(r));
    expect(out.state.resources).toEqual({ test_out: 5, test_x: 1 });
  });

  it('prevents duplicate crafting of a oneShot recipe', () => {
    const r = makeRecipe({ oneShot: true });
    const first = craft(makeState({ test_a: 4, test_b: 2 }), r.id, reg(r));
    expect(first.result.ok).toBe(true);
    expect(first.state.craftedRecipeIds).toEqual(['test_recipe']);
    const second = craft(first.state, r.id, reg(r));
    expect(second.result).toMatchObject({ ok: false, error: 'ALREADY_CRAFTED' });
    expect(second.state).toBe(first.state);
  });

  it('allows repeating a non-oneShot recipe', () => {
    const r = makeRecipe();
    const first = craft(makeState({ test_a: 4, test_b: 2 }), r.id, reg(r));
    const second = craft(first.state, r.id, reg(r));
    expect(second.result.ok).toBe(true);
    expect(second.state.resources).toEqual({ test_out: 2 });
  });

  it('does not mutate the input state', () => {
    const r = makeRecipe({ oneShot: true });
    const resources = Object.freeze({ test_a: 2, test_b: 1 });
    const crafted = Object.freeze<string[]>([]);
    const input: CraftingState = Object.freeze({ resources, craftedRecipeIds: crafted });
    const snapshot = structuredClone(input);
    const out = craft(input, r.id, reg(r));
    expect(out.result.ok).toBe(true);
    expect(input).toEqual(snapshot);
    expect(out.state).not.toBe(input);
    expect(out.state.resources).not.toBe(resources);
  });

  it('is atomic on failure: state is returned unchanged', () => {
    const r = makeRecipe();
    const input = makeState({ test_a: 2 });
    const snapshot = structuredClone(input);
    const out = craft(input, r.id, reg(r));
    expect(out.result.ok).toBe(false);
    expect(out.state).toBe(input);
    expect(input).toEqual(snapshot);
  });
});
