import { describe, expect, it } from 'vitest';
import { PERIODIC_TABLE_DATA } from './PeriodicTableData';
import { validatePeriodicTableData } from './PeriodicTableDataValidator';

describe('validatePeriodicTableData', () => {
  it('accepts the current 118-element dataset', () => {
    const result = validatePeriodicTableData(PERIODIC_TABLE_DATA);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects a non-array dataset', () => {
    const result = validatePeriodicTableData(null);

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('INVALID_DATASET');
  });

  it('rejects an incorrect element count', () => {
    const result = validatePeriodicTableData(
      PERIODIC_TABLE_DATA.slice(0, 117),
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_ELEMENT_COUNT',
      }),
    );
  });

  it('rejects duplicate atomic numbers', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[1] = {
      ...data[1],
      atomicNumber: data[0].atomicNumber,
    };

    const result = validatePeriodicTableData(data);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_ATOMIC_NUMBER',
      }),
    );
  });

  it('rejects duplicate symbols', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[1] = {
      ...data[1],
      symbol: data[0].symbol,
    };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_SYMBOL',
      }),
    );
  });

  it('rejects duplicate names regardless of case', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[1] = {
      ...data[1],
      name: data[0].name.toUpperCase(),
    };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_ELEMENT_NAME',
      }),
    );
  });

  it('rejects invalid symbols', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[0] = { ...data[0], symbol: 'hY' };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_SYMBOL',
      }),
    );
  });

  it('rejects invalid atomic weights', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[0] = { ...data[0], atomicWeight: 'unknown' };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_ATOMIC_WEIGHT',
      }),
    );
  });

  it('rejects invalid group and period values', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[0] = {
      ...data[0],
      group: 19,
      period: 8,
    };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_GROUP' }),
        expect.objectContaining({ code: 'INVALID_PERIOD' }),
      ]),
    );
  });

  it('rejects unsupported categories', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[0] = {
      ...data[0],
      category: 'unsupported',
    };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_CATEGORY',
      }),
    );
  });

  it('rejects incorrect f-block classification', () => {
    const data = PERIODIC_TABLE_DATA.map((element) => ({ ...element }));
    data[56] = {
      ...data[56],
      category: 'actinoid',
    };

    const result = validatePeriodicTableData(data);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_F_BLOCK_CLASSIFICATION',
      }),
    );
  });
});