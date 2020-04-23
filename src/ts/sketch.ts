import {fwd} from './fwd';
import { midiToFrequency as mtof } from './fwd/midi/helpers';
import { FwdTextEditor } from './fwd/control/FwdControl';
import { FwdAudioTrack } from './fwd/audio/Audio';

const kickSlider = fwd.controls.addSlider('kickAmount', {
  defaultValue: 0.5,
  min: 0,
  max: 0.8,
  step: 0.001
});

const padSlider = fwd.controls.addSlider('padAmount', {
  defaultValue: 0.3,
  min: 0,
  max: 0.5,
  step: 0.001
});

const kick1Editor = fwd.controls.addTextEditor('kick1', { defaultValue: 'x---x-----x--x--', maxLength: 16 });
const kick2Editor = fwd.controls.addTextEditor('kick2', { defaultValue: 'x-x-----x---x--x', maxLength: 16 });
const chordEditor = fwd.controls.addTextEditor('chord', { defaultValue: '0, 7, 11, 14, 16, 23, 26' });

const synthTrack = fwd.audio.addTrack('synth');
const kick1Track = fwd.audio.addTrack('kick1');
const kick2Track = fwd.audio.addTrack('kick2');

let chord: number[];
let base = 52;

export function init(): void {
  fwd.log('Start');

  let dur = 4;
  let counter = 0;
  const detune = 0.2;

  const oct = (v: number) => v * 12;

  const next = () => {
    const c = chordEditor.value.split(',').map(s => Number(s));
    
    const chords = [
      c,
      c.map((c: number) => c + 2),
      c.map((c: number) => c - 2),
      c
    ];

    chord = chords[counter % chords.length];

    if (counter === 4)    kickSequence();
    if (counter === 8)    kickSequence2();
    if (counter === 16)   arp();
    

    const voices = 4;
    const padGain = padSlider.value;

    for (let i = 0; i < voices; ++i) {
      chord.forEach((note) => playNote(base + note + fwd.random(-detune, detune), dur, 0.1 * padGain));
      playNote(chord[0] + base + fwd.random(-detune, detune) - oct(2), dur, 0.2 * padGain);
      playNote(chord[0] + base + fwd.random(-detune, detune) - oct(1), dur, 0.2 * padGain);
    }

    fwd.schedule(dur, next);

    counter++;
  };

  next();
}
function kickSequence() {
  fwd.log('Kick1');
  
  playSequence(kick1Editor, {
    sign: 'x',
    action: () => kick(kick1Track)
  });
}

function kickSequence2() {
  fwd.log('Kick2');

  playSequence(kick2Editor, {
    sign: 'x',
    action: () => kick(kick2Track)
  });
}

function arp() {
  fwd.log('Arp');
  let i = 0;
  next();

  function next() {
    const step = base + chord[i % chord.length] + Math.floor(i / chord.length) * 12;
    playNote(step, 1/8, 0.2);
    i++;
    i %= 16;
    fwd.schedule(1/8, next);
  }
}

function playSequence(editor: FwdTextEditor, ...mappings: { sign: string, action: Function}[]) {
  let i = 0;
  next();

  function next() {
    const pattern = editor.value.padEnd(16, '-');
    const step = pattern.substring(i % pattern.length)[0];

    mappings.forEach(({ sign, action }) => {
      if (step === sign)
        action();
    })

    i++;
    fwd.schedule(1/8, next);
  }
}

let trackCounter = 0;

function playNote(pitch: number, 
                  dur: number, 
                  vel: number = 0.05) {
  fwd.schedule(0, () => {
    const baseFreq = mtof(pitch);
    const osc = fwd.audio.osc(baseFreq);
    const gain = fwd.audio.gain(0.0);
    osc.connect(gain).connect(synthTrack);

    gain.gain.rampTo(vel, dur / 2);
    fwd.wait(dur / 2)
    gain.gain.rampTo(0, dur / 1.5);
    fwd.wait(dur / 1.5)

    osc.tearDown();
    gain.tearDown();
  });
}

export function kick(track: FwdAudioTrack) {
  fwd.schedule(0, () => {
    const osc = fwd.audio.osc(1000);
    const gain = fwd.audio.gain();
    
    osc.connect(gain).connect(track);

    gain.gain.rampTo(kickSlider.value, 0.001)
    osc.frequency.rampTo(50, 0.018);
    fwd.wait(0.02);
    gain.gain.rampTo(0.0, 0.2);

    fwd.wait(1);
    osc.tearDown();
    gain.tearDown();
  });
}