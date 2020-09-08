import { frequencyToNote, noteToFrequency } from "../../../src/fwd/midi/utils";

describe('MIDI helpers', () => {
  it ('converts from MIDI note number to frequency', () => {
    expect(noteToFrequency(69)).toBe(440);
    expect(noteToFrequency(81)).toBe(880);
  });

  it ('converts from frequency to MIDI note number', () => {
    expect(frequencyToNote(440)).toBe(69);
    expect(frequencyToNote(880)).toBe(81);
  });
});
