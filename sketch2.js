fwd.onStart = () => {
  const chain = fwd.scheduler
    .fire('arp')
    .wait(2)
  	.continueIfStillRunning();

  chain.concat(chain).trigger();
};

fwd.scheduler.defineAction('arp', () => {
  console.log('arppp');
  const noteOffset = Math.round(random(-5, 5));
  const notes = [48, 60, 67, 71, 74, 78, 90, 83, 86, 102, 95, 98];
  const reverbTime = 5;

  const timeBetweenNotes = 0.08;
  const attack = 0.01;
  const release = 0.08;

  const del = fwd.audio.stereoDelay();
  const rvb = fwd.audio.reverb(reverbTime);

  del.connect(rvb).connect(fwd.audio.master);

  notes.forEach((note, idx) => {
    const osc = fwd.audio.osc(mtof(note + noteOffset));
    osc.connect(del);

    fwd.scheduler
      .wait(idx * timeBetweenNotes)
      .fire(() => osc.gain.rampTo(0.1, attack))
      .wait(attack)
      .fire(() => osc.gain.rampTo(0, release))
      .wait(release)
      .wait(reverbTime)
      .fire(() => {
        osc.tearDown();
      })
      .trigger();
  });

  // Tear down audio nodes when not needed anymore
  const totalTime = timeBetweenNotes * notes.length
    + reverbTime
    + attack
    + release;

  fwd.scheduler.schedule(totalTime, () => {
    del.tearDown();
    rvb.tearDown();
  });
});

function mtof(noteNumber) {
  return (2 ** ((noteNumber - 69) / 12)) * 440;
}

function random(a, b) {
  if (a == null && b == null) {
    return Math.random();
  }

  if (b == null) {
    return a * Math.random();
  }

  return a + ((b - a) * Math.random());
}
