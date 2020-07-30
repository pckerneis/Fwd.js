import {midiToFrequency} from "./dist/api/api/midi/helpers";
import {getGuiManager} from "./dist/api/api/gui/Gui";

const gui = getGuiManager(fwd.editor.root.htmlElement);

gui.update = () => {
  gui.horizontalSlider('base', { max: 12, style: { width: "200px" } });
  console.log('gui updated', gui.getValue('base'));
}

gui.changed();

fwd.globals.steps = 32;
fwd.globals.dur = 5;

const chords_C9 = 	[ 0,  2,  4,  7];
const chords_Am9 = 	[-3, -1,  0,  4];
const chords_F9 = 	[-3,  0,  5,  7];
const chords_G9r = 	[-1,  2,  7,  9];
const chords_AbM7 = [-4,  0,  3,  7];
const chords_BbM7 = [-2,  2,  5,  9];
const chords_Fm9 = 	[-7, -5, -4,  0];
const chords_G9 = 	[-5, -3, -1,  2];

function concat(...chains) {
  return chains.reduce((accumulator, currentValue) => {
    return accumulator.concat(currentValue);
  });
}

function arp(chord, dur) {
  return fwd.scheduler
    .fire('arp', chord, dur())
    .wait(dur)
    .continueIfStillRunning();
}

const A = () => concat(
  arp(chords_C9, 		() => fwd.globals.dur),
  arp(chords_Am9, 	() => fwd.globals.dur),
  arp(chords_C9, 		() => fwd.globals.dur),
  arp(chords_Am9, 	() => fwd.globals.dur),
  arp(chords_F9, 		() => fwd.globals.dur),
  arp(chords_G9r, 	() => fwd.globals.dur),
  arp(chords_AbM7, 	() => fwd.globals.dur),
  arp(chords_BbM7, 	() => fwd.globals.dur),
);

const B = () => concat(
  arp(chords_C9, 		() => fwd.globals.dur),
  arp(chords_Fm9, 	() => fwd.globals.dur / 2),
  arp(chords_G9, 		() => fwd.globals.dur / 2),
);

fwd.onStart = () => {
  const loop = A()
    .concat(A())
    .concat(B())
    .fire(() => loop.trigger());

  loop.trigger();
	gui.changed();
};

fwd.scheduler.defineAction('arp', (chord, duration) => {
  duration = duration || fwd.globals.dur;

  const notes = chord.map(n => n + 12 * 4);
  const reverbTime = 2;
  const del = fwd.audio.stereoDelay();
  const rvb = fwd.audio.reverb(reverbTime);
  del.connect(rvb).connect(fwd.audio.master);

  const attack = 0.01;
  const release = 0.18;

  const timeBetweenNotes = fwd.globals.dur / fwd.globals.steps;

  for (let t = 0; t < fwd.globals.steps; ++t) {
    if (t * timeBetweenNotes < duration) {
      const i = t > fwd.globals.steps / 2 ? fwd.globals.steps - t : t;
      const p = notes[i % notes.length] + (Math.floor(i / notes.length) * 12);

      fwd.scheduler
    		.wait(t * timeBetweenNotes)
        .fire('playNote', t, p, timeBetweenNotes, attack, reverbTime, del, release).trigger();
    }
  }

  // Tear down audio nodes when not needed anymore
  const totalTime = timeBetweenNotes * fwd.globals.steps
    + reverbTime
    + attack
    + release;

  fwd.scheduler.schedule(totalTime, () => {
    del.tearDown();
    rvb.tearDown();
  });
});

fwd.scheduler.defineAction('playNote', (idx, noteNumber, timeBetweenNotes, attack, reverbTime, del, release) => {
  const osc = fwd.audio.osc(midiToFrequency(noteNumber + gui.getValue('base')));
  osc.connect(del);

  fwd.scheduler
    .fire(() => osc.gain.rampTo(0.1, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0, release))
    .wait(release)
    .wait(reverbTime)
    .fire(() => osc.tearDown())
    .trigger();
})