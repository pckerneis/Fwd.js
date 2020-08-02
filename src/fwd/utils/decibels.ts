/**
 * Converts from amplitude to decibels
 *
 * @param gain amplitude value to convert
 */
export function gainToDecibels(gain: number): number {
  return gain > 0 ? Math.log10(gain) * 20
      : -Infinity;
}

/**
 * Converts from decibels to amplitude
 *
 * @param decibels value in decibels
 */
export function decibelsToGain(decibels: number): number {
  return Math.pow(10, decibels * 0.05);
}
