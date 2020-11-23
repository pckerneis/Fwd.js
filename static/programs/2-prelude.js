const gui = fwd.gui.getGuiManager(fwd.editor.root.htmlElement);

gui.update = () => {
  gui.rootElement.style.display = 'grid';
  gui.rootElement.style.gridTemplateColumns = '1fr 2fr';
  gui.rootElement.style.gridAutoRows = '20px';
  gui.rootElement.style.padding = '10px';
  
  gui.label('detune');
  gui.slider('detune', { defaultValue: 0, max: 12, cssClasses: ['slider'] });
  
  gui.label('on/off');
  gui.slider('detuneActive', { 
    defaultValue: 0, max: 1, step: 1, style: { 
      width: "30px", margin: '0 auto'
    }, cssClasses: ['slider'] 
  });
};

gui.changed();

fwd.scheduler.env.steps = 32;
fwd.scheduler.env.dur = 5;

const chords_C9 = 	[ 0,  2,  4,  7];
const chords_Am9 = 	[-3, -1,  0,  4];
const chords_F9 = 	[-3,  0,  5,  7];
const chords_G9r = 	[-1,  2,  7,  9];
const chords_AbM7 = [-4,  0,  3,  7];
const chords_BbM7 = [-2,  2,  5,  9];
const chords_Fm9 = 	[-7, -5, -4,  0];
const chords_G9 = 	[-5, -3, -1,  2];

function concat(...chains) {
  return chains.slice(1).reduce((accumulator, currentValue) => {
    return accumulator.concat(currentValue);
  }, chains[0]);
}

function arp(chord, dur) {
  return fwd.scheduler
    .fire('arp', chord, dur())
    .wait(dur)
    .continueIfStillRunning();
}

const A = () => concat(
  arp(chords_C9, 		() => fwd.scheduler.env.dur),
  arp(chords_Am9, 	() => fwd.scheduler.env.dur),
  arp(chords_C9, 		() => fwd.scheduler.env.dur),
  arp(chords_Am9, 	() => fwd.scheduler.env.dur),
  arp(chords_F9, 		() => fwd.scheduler.env.dur),
  arp(chords_G9r, 	() => fwd.scheduler.env.dur),
  arp(chords_AbM7, 	() => fwd.scheduler.env.dur),
  arp(chords_BbM7, 	() => fwd.scheduler.env.dur),
);

const B = () => concat(
  arp(chords_C9, 		() => fwd.scheduler.env.dur),
  arp(chords_Fm9, 	() => fwd.scheduler.env.dur / 2),
  arp(chords_G9, 		() => fwd.scheduler.env.dur / 2),
);

fwd.onStart = () => {
  const loop = A()
    .concat(A())
    .concat(B())
    .fire(() => loop.trigger());

  loop.trigger();
	gui.changed();
};

fwd.scheduler.set('arp', (chord, duration) => {
  duration = duration || fwd.scheduler.env.dur;

  const notes = chord.map(n => n + 12 * 4);
  const reverbTime = 10;
  const del = fwd.audio.stereoDelay();
  const rvb = fwd.audio.reverb(reverbTime);
  rvb.dryGain.gain.value = 1.0;
  rvb.wetGain.gain.value = 1.0;
  del.connect(rvb);
  rvb.connect(fwd.audio.master);

  const attack = 0.01;
  const release = 0.18;

  const timeBetweenNotes = fwd.scheduler.env.dur / fwd.scheduler.env.steps;

  for (let t = 0; t < fwd.scheduler.env.steps; ++t) {
    if (t * timeBetweenNotes < duration) {
      const i = t > fwd.scheduler.env.steps / 2 ? fwd.scheduler.env.steps - t : t;
      const p = notes[i % notes.length] + (Math.floor(i / notes.length) * 12);

      fwd.scheduler
    		.wait(t * timeBetweenNotes)
        .fire('playNote', t, p, timeBetweenNotes, attack, reverbTime, del, release).trigger();
    }
  }

  // Tear down audio nodes when not needed anymore
  const totalTime = timeBetweenNotes * fwd.scheduler.env.steps +
        reverbTime +
        attack +
        release;

  fwd.scheduler.scheduleAhead(totalTime, () => {
    del.tearDown();
    rvb.tearDown();
  });
});

fwd.scheduler.set('playNote', (idx, noteNumber, timeBetweenNotes, attack, reverbTime, del, release) => {
  const osc = fwd.audio.osc(fwd.midi.noteToFrequency(noteNumber + gui.getValue('detune') * gui.getValue('detuneActive')));
  osc.connect(del);

  fwd.scheduler
    .fire(() => osc.gain.rampTo(0.1, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0, release))
    .wait(release)
    .wait(reverbTime)
    .fire(() => osc.tearDown())
    .trigger();
});
