const keyMappings = {
  'q': 60, 'z': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67,
  'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74, 'p': 75, 
  'm': 76, 'ù': 77, '$': 78, '*': 79,
};

const gain = 0.4;
const attackTime = 0.01;
const releaseTime = 0.3;

fwd.scheduler.defineAction('noteOn', (pitch) => {
  const freq = mtof(pitch);
  const osc = fwd.audio.osc(freq);
  const distorsion = fwd.audio.distortion(10);
  osc.connect(distorsion).connect(fwd.audio.master);

  fwd.scheduler
    .wait(() => fwd.scheduler.clock() + 0.01)
    .fire(() => osc.gain.rampTo(gain, attackTime))
    .trigger();

  fwd.globals.notes[pitch] = osc;
});

fwd.onStart = () => {
  fwd.globals.notes = [];

  fwd.editor.root.htmlElement.tabIndex = 0;
  fwd.editor.root.htmlElement.style.width = '100%';
  fwd.editor.root.htmlElement.style.height = '100%';

  fwd.editor.root.htmlElement.onkeydown = (event) => {
    const key = event.key.toLowerCase();
    if (keyMappings[key]) {
      press(keyMappings[key]);
    }
  };

  fwd.editor.root.htmlElement.onkeyup = (event) => {
    const key = event.key.toLowerCase();
    if (keyMappings[key]) {
      release(keyMappings[key]);
    }
  };

  fwd.editor.root.htmlElement.onblur = () => {
    releaseAll();
  };

  fwd.editor.root.htmlElement.focus();
};

function press(pitch) {
  if (fwd.globals.notes[pitch]) {
    return;
  }

  fwd.scheduler.fire('noteOn', pitch).trigger();
}

function releaseAll() {
  Object.keys(fwd.globals.notes).forEach((n) => {
    release(n);
  });

  fwd.globals.notes = [];
}

function release(pitch) {
  const osc = fwd.globals.notes[pitch];

  if (osc != null) {
    fwd.globals.notes[pitch] = null;

    fwd.scheduler
      .wait(() => fwd.scheduler.clock() + 0.01)
      .fire(() => osc.gain.rampTo(0, releaseTime))
      .wait(() => releaseTime)
      .fire(() => osc.tearDown())
      .trigger();
  }
}

function mtof(noteNumber) {
  return (2 ** ((noteNumber - 69) / 12)) * 440;
}
