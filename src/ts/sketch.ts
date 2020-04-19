import {fwd} from './fwd';
import { midiToFrequency } from './fwd/midi/helpers';

const a = 12*      23;

export function init(): void {
  const chords = [
    [0, 7, 11, 14, 16, 23],
    [2, 9, 13, 16, 18, 25],
    [-2, 6, 10, 13, 14, 21],
    [0, 7, 11, 13, 14, 16, 23]
  ];

  let dur = 4;
  let counter = 0;
  let base = 52;
  let detune = 0;

  const oct = (v: number) => v * 12;

  const next = () => {
    detune = fwd.random(-0.2, 0.2);
    fwd.log('detune', detune);
    const c = chords[counter];

    c.forEach((note) => playNote(base + note + detune, dur));
    playNote(c[0] + base + detune - oct(2), dur, 0.2);
    playNote(c[0] + base + detune - oct(1), dur, 0.2);

    fwd.schedule(dur, next);

    counter++;

    if (counter === chords.length) {
      counter = 0;
      base = Math.round(fwd.random(50, 55));
      fwd.log('base', base);
    }
  };

  next();
}

export function playNote(pitch: number, 
                        dur: number, 
                        vel: number = 0.1) {
  fwd.schedule(0, () => {
    const baseFreq = midiToFrequency(pitch);
    const osc = fwd.audio.osc(baseFreq);
    const gain = fwd.audio.gain(0.0);
    osc.connect(gain).connectToMaster();

    gain.gain.rampTo(vel, dur / 2);
    fwd.wait(dur / 2)
    gain.gain.rampTo(0, dur / 2);
    fwd.wait(dur / 2)

    osc.tearDown();
    gain.tearDown();
  });
}