import { clamp, map, parseNumber } from "../../../../src/fwd/utils/numbers";

it('maps a value from a range to another', () => {
  expect(map(0, 0, 0, 0, 0)).toBe(0);
  expect(map(0, 0, 100, 0, 0)).toBe(0);
  expect(map(0, 100, 0, 0, 0)).toBe(0);
  expect(map(0, 0, 0, 100, 0)).toBe(0);
  expect(map(0, 0, 0, 0, 100)).toBe(0);

  expect(map(50, 0, 100, 0, 1)).toBe(0.5);
  expect(map(50, 100, 0, 0, 1)).toBe(0.5);
  expect(map(50, -50, 50, 0, 1)).toBe(1);
  expect(map(-50, 0, 100, 0, 1)).toBe(-0.5);
  expect(map(50, 0, 10000, 0, 10000)).toBe(50);
});

it('parses strings as numbers', () => {
  expect(parseNumber(null)).toBe(0);
  expect(parseNumber('12354')).toBe(12354);
  expect(parseNumber(':)')).toBe(0);
  expect(parseNumber('-0.123')).toBe(-0.123);
  expect(parseNumber(4)).toBe(4);
  expect(parseNumber(Infinity)).toBe(Infinity);
  expect(parseNumber({ foo: 'bar' })).toBe(0);
});

it ('clamps numeric values', () => {
  expect(clamp(0, 0, 0)).toBe(0);
  expect(clamp(50, 0, 100)).toBe(50);

  expect(clamp(-100, 0, 100)).toBe(0);
  expect(clamp(500, 0, 100)).toBe(100);

  expect(clamp(50, 100, 0)).toBe(50);
  expect(clamp(500, 100, 0)).toBe(100);

  expect(clamp(500, 100, -100)).toBe(100);
});
