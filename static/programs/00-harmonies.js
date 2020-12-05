class Scale {
  constructor(length, steps) {
    this.length = length;
    this.steps = steps;
  }
}

const env = fwd.scheduler.env;
env.scale = new Scale(12, [0, 2, 4, 7, 9, 11]);
env.temperature = 1.0;

function init() {
  env.delay = fwd.audio.stereoDelay(2.0);

  env.delay
    .connect(fwd.audio.distortion(1.0))
    .connect(fwd.audio.reverb(1.0))
    .connectToMaster();
}

fwd.onStart = () => fwd.scheduler
  .fire(() => init())
  .fire(() => env.loop.trigger())
  .trigger();

env.loop = fwd.scheduler
  .fire(() => env.currentBass = env.bass.next())
	.repeat(8, fwd.scheduler
    .fire(() => {
      const chordOffset = env.ring.next();
      const chord = [0, 2, 4]
        .map(n => n + 30 + chordOffset + env.currentBass)
        .map(deg => project(deg, env.scale));

      chord.forEach(n => env.playNote(n, 0.05, 0.1));
    })
    .wait(beat(16)))
  .fire(() => env.loop.trigger());

env.playNote = (noteNumber, attack, release) => {
  const fq = fwd.midi.noteToFrequency(noteNumber);
  const osc = fwd.audio.osc(fq);
  osc.connect(env.delay);

  fwd.scheduler
    .fire(() => osc.gain.rampTo(0.2, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0, release))
    .wait(release)
    .fire(() => osc.tearDown())
    .trigger();
};

function beat(t) {
  return (60 / 120) * t * 0.25;
}

function project(degree, scale) {
  return Math.floor(degree / scale.steps.length) * scale.length + scale.steps[degree % scale.steps.length];
}

class Ring {
  constructor(array) {
    this.array = array;
    this.pos = -1;
  }

  next() {
    this.pos++;
    this.pos %= this.array.length;
    return this.array[this.pos];
  }
}

env.ring = new Ring([0, 2, 1, -1, 0, 0, 0, 0]);
env.bass = new Ring([0, -2, -4, -3]);
