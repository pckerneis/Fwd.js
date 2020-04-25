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
  return (value - sourceMin) 
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
  return str == null ? 0 :
    (typeof str === 'number' ? str :
      (typeof str === 'string' ? Number.parseFloat(str) : 0));
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