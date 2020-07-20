

fwd.onStart = function () {



fwd.globals.myMessage = 'hey you :)';

  const hFlex = fwd.editor.root.get('hflex')
  || fwd.editor.root.add('hflex', new Fwd.FlexPanel('row'));

const propertyPanel = hFlex.getOrAddFlexItem(
  'properties',
  () => new Fwd.FlexPanel('column'),
  {
    width: 300,
    minWidth: 100,
    maxWidth: 500,
    flexShrink: 0,
  }
);

hFlex.addSeparator(0, true);

const flex = hFlex.getOrAddFlexItem(
  'flex',
  () => new Fwd.FlexPanel('column'),
  {
    flexShrink: 1,
  }
);

const mixer = flex.getOrAddFlexItem(
  'mixer',
  () => new Fwd.AudioMixerPanel(fwd.audio.context),
  {
    height: 200,
    minHeight: 120,
    maxHeight: 600,
  });

flex.addSeparator(0, true);

const sequencer = flex.getOrAddFlexItem(
  'sequencer',
  () => new Fwd.NoteSequencerElement(fwd.audio.context),
  {
    minHeight: 0,
    maxHeight: 600,
    flexGrow: 1,
  }
);

const padTrack = mixer.getOrAddTrack("pad");
padTrack.htmlElement.style.background = "rgb(124,255,92)";
const arpTrack = mixer.getOrAddTrack("arp");
arpTrack.htmlElement.style.background = "rgb(231,155,65)";

const kick1Track = mixer.getOrAddTrack("kick1");
kick1Track.htmlElement.style.background = "rgb(255,250,67)";
const kick2Track = mixer.getOrAddTrack("kick2");
kick2Track.htmlElement.style.background = "rgb(106,255,128)";
const hhTrack = mixer.getOrAddTrack("hihat");
hhTrack.htmlElement.style.background = "rgb(156,144,255)";

const editor0 = propertyPanel.getOrAddFlexItem(
  'editor0',
  () => {
    const editor = new Fwd.TextAreaElement();
    editor.value = '0, 2, 4, 7, 11';
    return editor;
  },
  {});

const editor1 = propertyPanel.getOrAddFlexItem(
  'editor1',
  () => {
    const editor = new Fwd.TextAreaElement();
    editor.maxLength = 16;
    editor.mode = 'overwrite';
    editor.value = 'x-----x-----x---';
    return editor;
  },
  {});

const editor2 = propertyPanel.getOrAddFlexItem(
  'editor2',
  () => {
    const editor = new Fwd.TextAreaElement();
    editor.maxLength = 16;
    editor.mode = 'overwrite';
    editor.value = 'x---x---x---x---';
    return editor;
  },
  {});

const editor3 = propertyPanel.getOrAddFlexItem(
  'editor3',
  () => {
    const editor = new Fwd.TextAreaElement();
    editor.maxLength = 16;
    editor.mode = 'overwrite';
    editor.value = '--x---x---x---x-';
    return editor;
  },
  {});

  mixer.outputNode.connect(fwd.audio.master);

  const arpDelay = fwd.audio.stereoDelay();
  arpDelay.connect(fwd.audio.compressor()).connect(arpTrack.trackGraph.inputNode);
  const synthFxChain = fwd.audio.compressor();
  synthFxChain.connect(padTrack.trackGraph.inputNode);


// TODO: use fwd.scheduler.define
if (fwd.globals.hhSampler == null) {
  fwd.globals.hhSampler = fwd.audio.sampler('hh.wav');
  fwd.globals.hhSampler.connect(hhTrack.trackGraph.inputNode);
}

fwd.globals.hiHat = (vel = 0.9) => {
  fwd.schedule(0, () => {
    fwd.globals.hhSampler.outputNode.gain.value = 0.5 * vel * vel * vel * vel;
    fwd.globals.hhSampler.play();
  });
};


  let chord;
  let base = 52;

  let dur = 4;
  let counter = 0;
  const detune = 0.2;

  const oct = (v) => v * 12;

  const next = () => {
    const c = editor0.value.split(',').map(s => Number(s));

    const chords = [
      c,
      c.map((c) => c + 2),
      c.map((c) => c - 2),
      c,
    ];

    chord = chords[counter % chords.length];

    if (counter === 0)    kickSequence();
    if (counter === 8)    kickSequence2();
    if (counter === 4)    hhSequence();
    if (counter === 4)    arp();

    const voices = 4;
    const padGain = 0.3;

    for (let i = 0; i < voices; ++i) {
      chord.forEach((note) => playNote(synthFxChain, base + note + fwd.random(-detune, detune), dur, 0.1 * padGain));
      playNote(synthFxChain, chord[0] + base + fwd.random(-detune, detune) - oct(2), dur, 0.2 * padGain);
      playNote(synthFxChain, chord[0] + base + fwd.random(-detune, detune) - oct(1), dur, 0.2 * padGain);
    }

    fwd.schedule(dur, next);

    counter++;
  };

  next();

  // Global loop test
  fwd.globals.myMessage = 'hellooo!';

  function globalLoop() {
    console.log(fwd.globals.myMessage);

    fwd.schedule(1, () => {
      globalLoop();
    });
  }

  globalLoop();

  // ____________________________________________________

  function kickSequence() {
    console.log('Kick1');

    playSequence(
      editor1, {
        sign: 'x',
        action: () => fwd.globals.kick(kick1Track),
      });
  }

  function kickSequence2() {
    console.log('Kick2');

    playSequence(
      editor2, {
        sign: 'x',
        action: () => fwd.globals.kick(kick2Track, 30),
      });
  }

  function hhSequence() {
    console.log('HH');

    playSequence(
      editor3, {
        sign: 'x',
        action: () => fwd.globals.hiHat(),
      }, {
        sign: 'v',
        action: () => fwd.globals.hiHat(0.5),
      });
  }

  function arp() {
    console.log('Arpeggio!');
    let i = 0;
    next();

    function next() {
      const step = base + chord[i % chord.length] + Math.floor(i / chord.length) * 12;
      playNote(arpDelay, step, 1 / 8, 0.2);
      i++;
      i %= 16;
      fwd.schedule(1 / 8, next);
    }
  }

  function playSequence(textEditor, ...mappings) {
    let i = 0;

    // TODO: use fwd.scheduler.repeat??
    next();

    function next() {
      const pattern = textEditor.value.padEnd(16, '-');
      const step = pattern.substring(i % pattern.length)[0];

      mappings.forEach(({sign, action}) => {
        if (step === sign)
          action();
      });

      i++;
      fwd.schedule(1 / 8, next);
    }
  }

  function playNote(out, pitch, dur, vel = 0.05) {
    let osc;

    fwd.scheduler
      .fire(() => {
        const baseFreq = mtof(pitch);
        osc = fwd.audio.osc(baseFreq);
        osc.connect(out);
        osc.gain.value = 0;
        osc.gain.rampTo(vel, dur / 2);
      })
      .wait(dur / 2)
      .fire(() => {
        osc.gain.rampTo(0, dur / 1.5);
      })
      .wait(dur / 1.5)
      .wait(3)
      .fire(() => {
        osc.tearDown();
      })
      .trigger();
  }

  function mtof(noteNumber) {
    return (2 ** ((noteNumber - 69) / 12)) * 440;
  }
};

fwd.globals.kick = (track, tuning = 30) => {
  const osc = fwd.audio.osc(tuning * 8);
  osc.gain.value = 0;

  const disto = fwd.audio.distortion(1);
  const compressor = fwd.audio.compressor();

  osc.connect(disto).connect(compressor).connect(track.trackGraph.inputNode);

  fwd.scheduler
    .fire(() => {
      osc.gain.rampTo(0.8, 0.001);
      osc.frequency.rampTo(tuning * 1.5, 0.06);
    })
    .wait(0.1)
    .fire(() => {
      osc.frequency.rampTo(tuning, 0.050);
      osc.gain.rampTo(0.0, 0.2);
    })
    .wait(1)
    .fire(() => {
      osc.tearDown();
      disto.tearDown();
      compressor.tearDown();
    })
    .trigger();
};
