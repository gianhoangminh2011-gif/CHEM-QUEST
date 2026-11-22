import { describe, expect, it } from 'vitest';
import type { ElementCategory } from './ChemicalElement';
import {
  PERIODIC_TABLE_DATA,
  getElementByAtomicNumber,
  getElementBySymbol,
} from './PeriodicTableData';

const VALID_CATEGORIES = new Set<ElementCategory>([
  'alkali-metal',
  'alkaline-earth-metal',
  'transition-metal',
  'post-transition-metal',
  'metalloid',
  'reactive-nonmetal',
  'halogen',
  'noble-gas',
  'lanthanoid',
  'actinoid',
  'unknown',
]);

describe('PeriodicTableData', () => {
  it('contains exactly 118 elements', () => {
    expect(PERIODIC_TABLE_DATA).toHaveLength(118);
  });

  it('has atomic numbers from 1 to 118 in order', () => {
    const numbers = PERIODIC_TABLE_DATA.map(
      (element) => element.atomicNumber,
    );

    expect(numbers).toEqual(
      Array.from({ length: 118 }, (_, index) => index + 1),
    );
    expect(new Set(numbers).size).toBe(118);
  });

  it('has unique and correctly formatted symbols', () => {
    const symbols = PERIODIC_TABLE_DATA.map(
      (element) => element.symbol,
    );

    expect(new Set(symbols).size).toBe(118);

    for (const symbol of symbols) {
      expect(symbol).toMatch(/^[A-Z][a-z]?$/);
    }
  });

  it('has unique, non-empty element names', () => {
    const names = PERIODIC_TABLE_DATA.map(
      (element) => element.name,
    );

    expect(new Set(names).size).toBe(118);

    for (const name of names) {
      expect(name.trim().length).toBeGreaterThan(0);
      expect(name).toBe(name.trim());
    }
  });

  it('has valid metadata for every element', () => {
    for (const element of PERIODIC_TABLE_DATA) {
      expect(element.atomicNumber).toBeGreaterThanOrEqual(1);
      expect(element.atomicNumber).toBeLessThanOrEqual(118);

      expect(element.name.length).toBeGreaterThan(0);
      expect(element.symbol.length).toBeGreaterThan(0);

      expect(element.atomicWeight).toMatch(
        /^(?:\d+(?:\.\d+)?|\[\d+\])$/,
      );

      expect(element.period).toBeGreaterThanOrEqual(1);
      expect(element.period).toBeLessThanOrEqual(7);

      expect(VALID_CATEGORIES.has(element.category)).toBe(true);

      if (element.group !== null) {
        expect(Number.isInteger(element.group)).toBe(true);
        expect(element.group).toBeGreaterThanOrEqual(1);
        expect(element.group).toBeLessThanOrEqual(18);
      }
    }
  });

  it('classifies lanthanoids and actinoids correctly', () => {
    const lanthanoids = PERIODIC_TABLE_DATA
      .filter((element) => element.category === 'lanthanoid');

    const actinoids = PERIODIC_TABLE_DATA
      .filter((element) => element.category === 'actinoid');

    expect(lanthanoids.map((element) => element.atomicNumber)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 57),
    );

    expect(actinoids.map((element) => element.atomicNumber)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 89),
    );

    expect(
      [...lanthanoids, ...actinoids].every(
        (element) => element.group === null,
      ),
    ).toBe(true);
  });

  it('finds elements by atomic number', () => {
    expect(getElementByAtomicNumber(1)?.symbol).toBe('H');
    expect(getElementByAtomicNumber(6)?.symbol).toBe('C');
    expect(getElementByAtomicNumber(40)?.symbol).toBe('Zr');
    expect(getElementByAtomicNumber(118)?.symbol).toBe('Og');

    expect(getElementByAtomicNumber(0)).toBeUndefined();
    expect(getElementByAtomicNumber(119)).toBeUndefined();
  });

  it('finds elements by symbol without case sensitivity', () => {
    expect(getElementBySymbol('O')?.atomicNumber).toBe(8);
    expect(getElementBySymbol('Fe')?.atomicNumber).toBe(26);
    expect(getElementBySymbol('fe')?.atomicNumber).toBe(26);
    expect(getElementBySymbol('Og')?.atomicNumber).toBe(118);

    expect(getElementBySymbol('Xx')).toBeUndefined();
  });

  it('uses the CIAAW 2024 abridged value for zirconium', () => {
    expect(getElementBySymbol('Zr')?.atomicWeight).toBe('91.222');
  });
});