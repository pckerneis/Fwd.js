class Scale {
  constructor(length, steps) {
    this.length = length;
    this.steps = steps;
  }
}

const env = fwd.scheduler.env;

env.temperature = 0.8;

env.minPitch = 20;
env.maxPitch = env.minPitch + (30 * env.temperature);

env.minSpeed = 1 + Math.round((1 - env.temperature) * 5);
env.maxSpeed = 8 + Math.round((1 - env.temperature) * 10);

// env.minLength = Math.round(1 + (1 - env.temperature) * 50);
// env.maxLength = Math.round(8 + (1 - env.temperature) * 50);
env.maxLength = env.minLength = 32;

env.scale = new Scale(12, [0, 2, 4, 7, 9, 11]);

fwd.onStart = () => fwd.scheduler
  .fire(() => init())
  .fire(() => {

    env.cells = [];
    env.cells.push(new Cell());
    env.cells.push(new Cell());
  })
  .fire(() => env.loop.trigger())
  .trigger();

env.loop = fwd.scheduler
  .fire(() => {
    const fired = [];
    env.cells.forEach((cell) => {
      if (cell.next()) {
        fired.push(cell);
      }
    });

    if (fired.length === 2) {
      const first = fired[0];
      const second = fired[1];

      const newCell = new Cell();

      combine(first, second, 'pitch', newCell);
      combine(first, second, 'speed', newCell);
      combine(first, second, 'length', newCell);
      combine(first, second, 'onsets', newCell);
      combine(first, second, 'rot', newCell);

      env.cells.push(new Cell());
      console.log('+1 : ' + env.cells.length);
    } else if (fired.length > 3) {
      const pickedIndex = Math.floor(fwd.utils.random(fired.length));
      const picked = fired[pickedIndex];
      env.cells.splice(env.cells.indexOf(picked), 1);
      console.log('-1 : ' + env.cells.length);
    }
  })
  .wait(beat(1))
  .fire(() => env.loop.trigger());

function combine(first, second, prop, affectedCell) {
  if (fwd.utils.random() > 0.5) {
    first[prop] = fwd.utils.random() > 0.5 ? first[prop] : second[prop];
  } else {
    if (first[prop] === second[prop]) {
    } else {
      affectedCell[prop] = Math.floor(fwd.utils.random(first, second));
      affectedCell.updateSequence();
    }
  }
}

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
  const fq = fwd.midi.noteToFrequency(noteNumber);
  const osc = fwd.audio.osc(fq * fwd.utils.random(1, 5));
  osc.connect(env.delay);

  const noise = fwd.audio.noise();
  const gain = fwd.audio.gain(0);
  noise.connect(gain);
  gain.connect(env.delay);

  fwd.scheduler
    .fire(() => osc.frequency.rampTo(fq + fwd.utils.random(-5, 5) * env.temperature, attack * 0.5))
    .fire(() => osc.gain.rampTo(0.2, attack))
    .fire(() => gain.gain.rampTo(0.03, 0))
    .fire(() => gain.gain.rampTo(0, attack))
    .wait(attack)
    .fire(() => osc.gain.rampTo(0, release))
    .wait(release)
    .fire(() => osc.tearDown())
    .fire(() => noise.tearDown())
    .fire(() => gain.tearDown())
    .trigger();
};

function init() {
  env.delay = fwd.audio.stereoDelay(2.0);

  env.delay
    .connect(fwd.audio.distortion(1.0))
    .connect(fwd.audio.reverb(1.0))
    .connectToMaster();
}

//===============================================================================

class Cell {
  age;
  sequence;
  pitch;
  speed;
  length;
  onsets;
  rot;

  constructor() {
    this.age = 0;
    this.pitch = Math.round(fwd.utils.random(env.minPitch, env.maxPitch));
    this.speed = Math.round(fwd.utils.random(env.minSpeed, env.maxSpeed));
    this.length = Math.round(fwd.utils.random(env.minLength, env.maxLength));
    this.onsets = Math.round(fwd.utils.random(this.length));
    this.rot = Math.round(fwd.utils.random(this.length));

    this.updateSequence();
  }

  updateSequence() {
    this.sequence = new Ring(rotated(euclid(this.onsets, this.length), this.rot));
  }

  next() {
    this.age++;

    if (this.age % this.speed === 0) {
      const onset = this.sequence.next();

      if (Boolean(onset)) {
        const p = project(this.pitch, env.scale);
        env.playNote(p, 0.03, 0.1);
        return 1;
      }
    }

    return 0;
  }
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

function project(degree, scale) {
  return Math.floor(degree / scale.steps.length) * scale.length + scale.steps[degree % scale.steps.length];
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
