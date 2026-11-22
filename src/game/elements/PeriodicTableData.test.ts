import { describe, expect, it } from 'vitest';
import {
  PERIODIC_TABLE_DATA,
  getElementByAtomicNumber,
  getElementBySymbol,
} from './PeriodicTableData';

describe('PeriodicTableData', () => {
  it('contains exactly 118 elements', () => {
    expect(PERIODIC_TABLE_DATA).toHaveLength(118);
  });

  it('has unique atomic numbers from 1 to 118', () => {
    const numbers = PERIODIC_TABLE_DATA.map(
      (element) => element.atomicNumber,
    );

    expect(new Set(numbers).size).toBe(118);
    expect(numbers).toEqual(
      Array.from({ length: 118 }, (_, index) => index + 1),
    );
  });

  it('has unique element symbols', () => {
    const symbols = PERIODIC_TABLE_DATA.map(
      (element) => element.symbol,
    );

    expect(new Set(symbols).size).toBe(118);
  });

  it('finds elements by atomic number', () => {
    expect(getElementByAtomicNumber(1)?.symbol).toBe('H');
    expect(getElementByAtomicNumber(6)?.symbol).toBe('C');
    expect(getElementByAtomicNumber(118)?.symbol).toBe('Og');
    expect(getElementByAtomicNumber(119)).toBeUndefined();
  });

  it('finds elements by symbol', () => {
    expect(getElementBySymbol('O')?.atomicNumber).toBe(8);
    expect(getElementBySymbol('Fe')?.atomicNumber).toBe(26);
    expect(getElementBySymbol('Og')?.atomicNumber).toBe(118);
    expect(getElementBySymbol('Xx')).toBeUndefined();
  });
});