export function gainToDecibels(gain: number): number {
  return gain > 0 ? Math.log10(gain) * 20
      : -Infinity;
}

export function decibelsToGain(decibels: number): number {
  return Math.pow(10, decibels * 0.05);
}
