import { describe, expect, it } from 'vitest';
import { centsToValue, valueToCents, sumCents } from './money';
import { newId, idPattern } from './ids';

describe('money', () => {
  it('formats cents as PayPal values', () => {
    expect(centsToValue(0)).toBe('0.00');
    expect(centsToValue(5)).toBe('0.05');
    expect(centsToValue(2800)).toBe('28.00');
    expect(centsToValue(123456)).toBe('1234.56');
  });

  it('round-trips values', () => {
    for (const c of [0, 1, 99, 100, 2805, 999999]) expect(valueToCents(centsToValue(c))).toBe(c);
    expect(valueToCents('28')).toBe(2800);
  });

  it('rejects floats, negatives and malformed values', () => {
    expect(() => centsToValue(1.5)).toThrow();
    expect(() => centsToValue(-1)).toThrow();
    expect(() => valueToCents('28.5')).toThrow();
    expect(() => valueToCents('-1.00')).toThrow();
    expect(() => valueToCents('1e3')).toThrow();
    expect(() => sumCents([1, 0.1])).toThrow();
  });
});

describe('ids', () => {
  it('generates prefixed ids matching their pattern', () => {
    const id = newId('product');
    expect(id).toMatch(idPattern('product'));
    expect(id).not.toMatch(idPattern('variant'));
    expect(new Set(Array.from({ length: 1000 }, () => newId('checkout'))).size).toBe(1000);
  });
});
