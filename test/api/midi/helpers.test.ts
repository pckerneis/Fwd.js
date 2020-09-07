import { frequencyToMidi, midiToFrequency } from "../../../src/fwd/midi/helpers";

describe('MIDI helpers', () => {
  it ('converts from MIDI note number to frequency', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBe(880);
  });

  it ('converts from frequency to MIDI note number', () => {
    expect(frequencyToMidi(440)).toBe(69);
    expect(frequencyToMidi(880)).toBe(81);
  });
});
