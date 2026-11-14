
import { describe, expect, it } from 'vitest';
import {
  ELEMENT_CATALOG,
  getElementRecordsForResources,
} from './ElementCatalog';

describe('ElementCatalog', () => {
  it('defines the three current world crystal samples', () => {
    expect(ELEMENT_CATALOG).toHaveLength(3);

    expect(
      ELEMENT_CATALOG.every(
        (element) => element.identificationStatus === 'unidentified'
      )
    ).toBe(true);

    expect(
      ELEMENT_CATALOG.every(
        (element) => element.atomicNumber === null && element.symbol === '?'
      )
    ).toBe(true);
  });

  it('maps collected resource IDs to catalog records', () => {
    const records = getElementRecordsForResources([
      'crystal-540-210',
      'crystal-760-335',
    ]);

    expect(records.map((element) => element.id)).toEqual([
      'crystal-sample-01',
      'crystal-sample-02',
    ]);
  });

  it('ignores resource IDs that are not in the catalog', () => {
    expect(
      getElementRecordsForResources(['unknown-resource'])
    ).toEqual([]);
  });

  it('does not return duplicate records', () => {
    const records = getElementRecordsForResources([
      'crystal-540-210',
      'crystal-540-210',
    ]);

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('crystal-sample-01');
  });

  it('preserves the order of collected resource IDs', () => {
    const records = getElementRecordsForResources([
      'crystal-225-310',
      'crystal-540-210',
    ]);

    expect(records.map((element) => element.id)).toEqual([
      'crystal-sample-03',
      'crystal-sample-01',
    ]);
  });
});
