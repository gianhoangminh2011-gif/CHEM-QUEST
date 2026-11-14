
import { describe, expect, it } from 'vitest';
import {
  ELEMENT_CATALOG,
  getElementRecordsForResources,
} from './ElementCatalog';

describe('ElementCatalog', () => {
  it('defines three unidentified fictional samples', () => {
    expect(ELEMENT_CATALOG).toHaveLength(3);

    for (const element of ELEMENT_CATALOG) {
      expect(element.identificationStatus).toBe('unidentified');
      expect(element.atomicNumber).toBeNull();
      expect(element.symbol).toBe('?');
    }
  });

  it('maps collected resource IDs to catalog records', () => {
    const records = getElementRecordsForResources([
      'crystal-540-210',
      'crystal-760-335',
    ]);

    expect(records.map((record) => record.id)).toEqual([
      'crystal-sample-01',
      'crystal-sample-02',
    ]);
  });

  it('ignores unknown resource IDs', () => {
    const records = getElementRecordsForResources([
      'unknown-resource',
      'crystal-540-210',
    ]);

    expect(records.map((record) => record.id)).toEqual([
      'crystal-sample-01',
    ]);
  });

  it('removes duplicate records', () => {
    const records = getElementRecordsForResources([
      'crystal-540-210',
      'crystal-540-210',
    ]);

    expect(records).toHaveLength(1);
  });

  it('preserves collection order', () => {
    const records = getElementRecordsForResources([
      'crystal-225-310',
      'crystal-540-210',
      'crystal-760-335',
    ]);

    expect(records.map((record) => record.id)).toEqual([
      'crystal-sample-03',
      'crystal-sample-01',
      'crystal-sample-02',
    ]);
  });
});
