import { decibelsToGain, gainToDecibels } from "../../../../src/fwd/core/utils/decibels";

const testValues = [
  [-120, 0.000001],
  [-40, 0.01],
  [0, 1],
  [3, 1.4125375446227544],
  [6, 1.9952623149688797],
];

function tolerantCompare(a: number, b: number, tolerance: number): boolean {
  return a >= b - tolerance && a <= b + tolerance;
}

it('converts from decibels to amplitude', () => {
  testValues.forEach(([dB, amp]) => {
    expect(decibelsToGain(dB)).toBe(amp);
  });
});

it('converts from amplitude to decibels', () => {
  testValues.forEach(([dB, amp]) => {
    expect(tolerantCompare(gainToDecibels(amp), dB, 0.000000000000001)).toBeTruthy();
  });
});