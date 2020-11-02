const env = fwd.scheduler.env;

fwd.onStart = () => env.playNote(69, 0.01, 2);


env.playNote = (noteNumber, attack, release) => {
  const osc = fwd.audio.osc(fwd.midi.noteToFrequency(noteNumber));
  osc.connectToMaster();

  fwd.scheduler.chain(
    () => console.log('uuuh'),
    [
      () => osc.gain.rampTo(0.1, attack),
      attack,
      () => console.log('jey'),
      () => osc.gain.rampTo(0, release),
    ],
    () => console.log('yay'),
    release,
    () => osc.tearDown(),
  ).trigger();
};
