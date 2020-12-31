import WebMidi, { Output } from 'webmidi';
import { frequencyToNote, noteToFrequency } from './utils';

export interface FwdMidi {
  noteToFrequency(noteNumber: number): number;
  frequencyToNote(frequency: number): number;
}

export const fwdMidi = {
  noteToFrequency,
  frequencyToNote,
};

export function enableMidi(): void {
  WebMidi.enable((err) => {
    if (err != null) {
      console.error(err);
    } else {
      // console.log(WebMidi.inputs);
      // console.log(WebMidi.outputs);
    }
  })
}

export function getMidiOutputNames(): string[] {
  return WebMidi.outputs.map(output => output.name);
}

export function getOutputByName(name: string): Output {
  return WebMidi.getOutputByName(name) || null;
}
