import { frequencyToNote, noteToFrequency } from './utils';

export interface FwdMidi {
  noteToFrequency(noteNumber: number): number;
  frequencyToNote(frequency: number): number;
}

export const fwdMidi = {
  noteToFrequency,
  frequencyToNote,
};
