const env = fwd.scheduler.env;

fwd.onStart = () => fwd.scheduler
  .fire(() => init())
  .fire(() => env.loop.trigger())
  .trigger();

env.loop = fwd.scheduler
  .fire(() => prepareChords())
  .fire(() => playChord())
  .wait(beat(16))
  .fire(() => playChord())
  .wait(beat(16))
  .fire(() => playChord())
  .wait(beat(16))
  .fire(() => playChord())
  .wait(beat(16))
  .fire(() => env.loop.trigger());

env.eucl = (onsets, length, note, rot = 0) => {
  const eucl = rotated(euclid(onsets, length), rot);

  eucl.forEach((step, t) => {
    if (step > 0) {
      fwd.scheduler
        .wait(beat(t))
        .fire(() => env.playNote(note, 0.01, 0.1))
        .trigger();
    }
  });
};

env.playNote = (noteNumber, attack, release) => {
  const osc = fwd.audio.osc(fwd.midi.noteToFrequency(noteNumber));
  osc.connect(env.delay);

  fwd.scheduler
    .fire(() => osc.gain.rampTo(0.1, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0, release))
    .wait(release)
    .fire(() => osc.tearDown())
    .trigger();
};

function init() {
  console.log('initialize');

  env.delay = fwd.audio.stereoDelay(2.0);

  env.delay
    .connect(fwd.audio.distortion(1.0))
    .connect(fwd.audio.reverb(1.0))
    .connectToMaster();
}

function prepareChords() {
  const scale = new Scale(12, [0, 2, 4, 5, 7, 9, 11]);
  const seventh = [0, 2, 4, 6];
  const baseOffset = 50;
  
  const makeChord = (root) => transposed(
    baseOffset, 
    projectChord(transposed(root, seventh), scale)
  );

  env.chords = new Ring([0, 3, 5, 3].map(n => makeChord(n)));
}

function playChord() {
  const onsets = [3, 6, 7, 9];
  const chord = env.chords.next();
  chord.forEach((n, i) => env.eucl(onsets[i], 16, n, i));
}

//===============================================================================

function transposed(offset, array) {
  return array.map(item => item + offset);
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

class Scale {
  constructor(length, steps) {
    this.length = length;
    this.steps = steps;
  }
}

function projectChord(degrees, scale) {
  return degrees.map((deg) => {
    return Math.floor(deg / scale.steps.length) * scale.length + scale.steps[deg % scale.steps.length];
  });
}

function euclid(onsets, totalPulses) {
  var previous = null;
  var pattern = [];

  for (var i = 0; i < totalPulses; i++) {
    var xVal = Math.floor((onsets / totalPulses) * i);
    pattern.push(xVal === previous ? 0 : 1);
    previous = xVal;
  }
  return pattern;
}

function rotated(array, offset) {
  offset = offset % array.length;
  if (offset < 0) {
    offset += array.length;
  }

  return [
    ...array.slice(offset),
    ...array.slice(0, offset),
  ];
}

function beat(t) {
  return (60 / 120) * t * 0.25;
}
