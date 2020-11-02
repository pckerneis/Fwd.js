const scale = [0, 2, 3, 5, 7, 9, 10];
// const scale = [0, 2, 4, 5, 7, 9, 11];
const base = 42;

fwd.onStart = () => {
  const chain = fwd.scheduler
    .fire('playSomeNotes')
    .wait(5)
  	.continueIfStillRunning()
  	.fire(() => chain.trigger());
  
  chain.trigger();
};

fwd.scheduler.set('playSomeNotes', () => {
  const notes = generateChord()
    .map(note => note + base);

  notes.forEach((note, index) => {
      if (Math.random() < 0.12) {
          notes[index] += 12;
      }
  });
      
  notes.forEach((note, i) => {
    fwd.scheduler
    	.wait(0.1 * i)
      .fire('playNote', note)
      .trigger();
  }); 
});

fwd.scheduler.set('playNote', (noteNumber) => {
  const attack = 0.005;
  const release = 5.0;

  const targetFq = fwd.midi.noteToFrequency(noteNumber);
  const startFq = targetFq * 2;

  const fx = fwd.audio.stereoDelay(5.0);
  fx.connectToMaster();

  const osc = fwd.audio.osc(startFq);
  osc.connect(fx);

  fwd.scheduler
    .fire(() => osc.frequency.rampTo(targetFq, attack))
    .fire(() => osc.gain.rampTo(0.1, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0, release))
    .wait(release)
    .wait(5)
    .fire(() => osc.tearDown())
    .fire(() => fx.tearDown())
    .trigger();
});

function generateChord() {
    const chord = [];

    let previous = 0;

    for (let i = 0; i < 7; ++i) {
        const pick = previous + Math.floor(Math.random() * 4) + 1;
        chord.push(pickNoteOnScale(pick));
        previous = pick;
    }

    return chord;
}

function pickNoteOnScale(index) {
    return Math.floor(index / scale.length) * 12 + scale[index % scale.length];
}
