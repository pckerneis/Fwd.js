import { decibelsToGain, gainToDecibels } from "../../../../src/utils/decibels";
import { tolerantCompare } from "../../../test-utils";

const testValues = [
  [-Infinity, 0],
  [-120, 0.000001],
  [-40, 0.01],
  [0, 1],
  [3, 1.4125375446227544],
  [6, 1.9952623149688797],
];

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
