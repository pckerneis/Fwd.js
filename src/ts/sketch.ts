import {fwd} from './fwd';

fwd.controls.addSlider('base', {
  defaultValue: 500,
  min: 0,
  max: 5000,
  step: 1
});

fwd.controls.addSlider('range', {
  defaultValue: 0,
  min: 0,
  max: 200,
  step: 1
});

export function init() {
  for (let i = 0; i < 5; ++i) {
    fwd.schedule(i * 5, loop);

    fwd.schedule(i * 5, () => {
      fwd.controls.addSlider('a'+i, {
        defaultValue: 0,
        min: 0,
        max: 200,
        step: 1
      });
    });
  }
}

function loop() {
  const range = fwd.controls.getSlider('range').value;
  const base = fwd.controls.getSlider('base').value;
  const fq = base + fwd.random(range);
  const itv = fwd.random(0.1, 0.5);

  beep(fq);
  fwd.schedule(itv, loop);
}

function beep(fq: number) {
  fwd.log('beep');

  let osc = fwd.audio.osc(fq);
  let gain = fwd.audio.gain();
  osc.connect(gain).connect(fwd.audio.master);

  gain.rampTo(0.15, 0.008);
  fwd.wait(0.1);
  gain.rampTo(0, 0.2);
  fwd.wait(0.2);
  osc.tearDown();
  gain.tearDown();
}
