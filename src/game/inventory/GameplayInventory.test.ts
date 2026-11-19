
import { describe, expect, it } from 'vitest';
import { buildGameplayInventory } from './GameplayInventory';

describe('buildGameplayInventory', () => {
  it('creates an empty inventory', () => {
    const inventory = buildGameplayInventory([]);

    expect(Object.keys(inventory.resources)).toEqual([]);
  });

  it('transfers collected crystals into inventory', () => {
    const inventory = buildGameplayInventory([
      'crystal-540-210',
      'crystal-760-335',
    ]);

    expect(inventory.resources['crystal-540-210']).toBe(1);
    expect(inventory.resources['crystal-760-335']).toBe(1);
  });

  it('ignores non-crystal resources', () => {
    const inventory = buildGameplayInventory([
      'outcrop-350-315',
      'crystal-540-210',
    ]);

    expect(Object.keys(inventory.resources)).toEqual([
      'crystal-540-210',
    ]);
  });

  it('does not mutate the source resource list', () => {
    const ids = ['crystal-540-210'];

    buildGameplayInventory(ids);

    expect(ids).toEqual(['crystal-540-210']);
  });
});
