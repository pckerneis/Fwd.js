import { fwd } from './fwd';
import { FwdAudioNode } from "./fwd/audio/nodes/FwdAudioNode";
import { FwdAudioTrack } from "./fwd/audio/nodes/FwdAudioTrack";
import { FwdStereoDelayNode } from "./fwd/audio/nodes/StandardAudioNodes";
import { FwdTextEditor } from './fwd/control/FwdControl';
import { midiToFrequency as mtof } from './fwd/midi/helpers';

const kickSlider = fwd.controls.addSlider('kickAmount', {
  defaultValue: 0.5,
  min: 0,
  max: 0.8,
  step: 0.001,
});

const padSlider = fwd.controls.addSlider('padAmount', {
  defaultValue: 0.3,
  min: 0,
  max: 0.5,
  step: 0.001,
});

const kick1Editor = fwd.controls.addTextEditor('kick1', {
  defaultValue: 'x---x-----x--x--',
  maxLength: 16,
  writeMode: 'overwrite',
});

const kick2Editor = fwd.controls.addTextEditor('kick2', {
  defaultValue: 'x-x-----x---x--x',
  maxLength: 16,
  writeMode: 'overwrite',
});
const chordEditor = fwd.controls.addTextEditor('chord', { defaultValue: '0, 7, 11, 14, 16, 23, 26' });

const synthTrack = fwd.audio.addTrack('synth', { gain: 0.5 });
const arpTrack = fwd.audio.addTrack('arp', { gain: 0.5 });
const kick1Track = fwd.audio.addTrack('kick1', { pan: 0.25 });
const kick2Track = fwd.audio.addTrack('kick2', { pan: -0.25, mute: true });

let synthFxChain: FwdAudioNode;
let arpDelay: FwdStereoDelayNode;

let chord: number[];
let base = 52;

export function init(): void {
  arpDelay = fwd.audio.stereoDelay();
  arpDelay.connect(fwd.audio.compressor()).connect(arpTrack);
  synthFxChain = fwd.audio.compressor();
  synthFxChain.connect(synthTrack);

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
      c,
    ];

    chord = chords[counter % chords.length];

    if (counter === 0)    kickSequence();
    if (counter === 0)    kickSequence2();
    if (counter === 0)    arp();

    const voices = 4;
    const padGain = padSlider.value;

    for (let i = 0; i < voices; ++i) {
      chord.forEach((note) => playNote(synthFxChain, base + note + fwd.random(-detune, detune), dur, 0.1 * padGain));
      playNote(synthFxChain, chord[0] + base + fwd.random(-detune, detune) - oct(2), dur, 0.2 * padGain);
      playNote(synthFxChain, chord[0] + base + fwd.random(-detune, detune) - oct(1), dur, 0.2 * padGain);
    }

    fwd.schedule(dur, next);

    counter++;
  };

  next();
}

function kickSequence(): void {
  fwd.log('Kick1');
  
  playSequence(kick1Editor, {
    sign: 'x',
    action: () => kick(kick1Track),
  });
}

function kickSequence2(): void {
  fwd.log('Kick2');

  playSequence(kick2Editor, {
    sign: 'x',
    action: () => kick(kick2Track, 30),
  });
}

function arp(): void {
  fwd.log('Arp');
  let i = 0;
  next();

  function next(): void {
    const step = base + chord[i % chord.length] + Math.floor(i / chord.length) * 12;
    playNote(arpDelay, step, 1/8, 0.2);
    i++;
    i %= 16;
    fwd.schedule(1/8, next);
  }
}

function playSequence(editor: FwdTextEditor, ...mappings: { sign: string, action: Function}[]): void {
  let i = 0;
  next();

  function next(): void {
    const pattern = editor.value.padEnd(16, '-');
    const step = pattern.substring(i % pattern.length)[0];

    mappings.forEach(({ sign, action }) => {
      if (step === sign)
        action();
    });

    i++;
    fwd.schedule(1/8, next);
  }
}

function playNote(out: FwdAudioNode,
                  pitch: number,
                  dur: number, 
                  vel: number = 0.05): void {
  fwd.schedule(0, () => {
    const baseFreq = mtof(pitch);
    const osc = fwd.audio.osc(baseFreq);
    osc.connect(out);
    osc.gain.value = 0;

    osc.gain.rampTo(vel, dur / 2);
    fwd.wait(dur / 2);
    osc.gain.rampTo(0, dur / 1.5);
    fwd.wait(dur / 1.5);

    fwd.wait(3);

    osc.tearDown();
  });
}

export function kick(track: FwdAudioTrack, tuning: number = 30): void {
  fwd.schedule(0, () => {
    const osc = fwd.audio.osc(tuning * 20);
    osc.gain.value = 0;

    const disto = fwd.audio.distortion(5);
    const compressor = fwd.audio.compressor();

    osc.connect(disto).connect(compressor).connect(track);

    osc.gain.rampTo(kickSlider.value, 0.001);
    osc.frequency.rampTo(tuning * 1.2, 0.005);
    fwd.wait(0.05);
    osc.frequency.rampTo(tuning, 0.010);

    osc.gain.rampTo(0.0, 0.2);

    fwd.wait(1);
    osc.tearDown();
    disto.tearDown();
    compressor.tearDown();
  });
}