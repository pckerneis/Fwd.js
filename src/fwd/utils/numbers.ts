import SimplexNoise from 'simplex-noise';

/**
 * Map a value from a source range to a target range.
 *
 * @param value the value to map
 * @param sourceMin the source range minimum
 * @param sourceMax the source range maximum
 * @param targetMin the target range minimum
 * @param targetMax the target range maximum
 * @returns the value mapped into the target range
 */
export function map(value: number,
    sourceMin: number, sourceMax: number,
    targetMin: number, targetMax: number): number {

  const sourceRange = sourceMax - sourceMin;

  return sourceRange === 0 ? sourceMin : (value - sourceMin)
      * (targetMax - targetMin) / (sourceMax - sourceMin)
      + targetMin;
}

/**
 * Parse a string to number. It's just a call to `Number.parseFloat` with additional type checking.
 *
 * @param str a number as string.
 * @returns the parsed number. Defaults to 0 if the provided argument is not a string
 */
export function parseNumber(str: any): number {
  const nativeParse = Number.parseFloat(str);

  return str == null ? 0 :
    (typeof str === 'number' ? str :
      (typeof str !== 'string' ? 0 :
        (isNaN(nativeParse) ? 0 : nativeParse)));
}

/**
 * Constrain a numeric value between two numeric bounds. The order between the bounds isn't relevant.
 *
 * @param value the value to constrain
 * @param a first bound
 * @param b second bound
 */
export function clamp(value: number, a: number, b: number): number {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.min(Math.max(min, value), max);
}

/**
 * Generates a pseudo-random number between the specified bounds. The generated number will be between the lower
 * bound (inclusive) and the upper bound (exclusive). If no arguments as provided, it will output a number between
 * 0 and 1. If one argument is provided, it will output a number between 0 and this argument. If both arguments
 * are present, it will output a number between these two numbers.
 * Parameters can be negative or positive numbers. When both parameters are present, the order doesn't matter.
 *
 * @param a If `b` is not provided, `a` is the upper bound and the lower bound is `0`.
 *          If `b` is provided, `a` is the lower bound.
 * @param b Upper bound.
 */
export function random(a?: number, b?: number): number {
  if (a == null && b == null) {
    return Math.random();
  }

  if (b == null) {
    return a * Math.random();
  }

  return a + ((b - a) * Math.random());
}

const simplexNoise = new SimplexNoise();

export function simplex(x: number, y: number, z?: number, w?: number): number {
  if (w != null)
    return simplexNoise.noise4D(x, y, z, w);
  else if (z != null)
    return simplexNoise.noise3D(x, y, z);

  return simplexNoise.noise2D(x, y);
}