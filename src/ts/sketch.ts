import {fwd} from './fwd';

fwd.controls.addSlider('base', {
  defaultValue: 500,
  min: 0,
  max: 5000,
  step: 1,
});

fwd.controls.addSlider('range', {
  defaultValue: 0,
  min: 0,
  max: 200,
  step: 1,
});

export function init(): void {
  for (let i = 0; i < 5; ++i) {
    fwd.schedule(i * 50, loop);
  }
}

export
function loop(): void {
  const range = fwd.controls.getSlider('range').value;
  const base = fwd.controls.getSlider('base').value;
  const fq = base + fwd.random(range);
  const itv = fwd.random(0.1, 0.5);

  beep(fq);
  fwd.schedule(itv, loop);
}

export
function beep(fq: number): void {
  fwd.log('beep');

  const lfo = fwd.audio.lfo(100);
  const osc = fwd.audio.osc(fq);
  const gain = fwd.audio.gain();

  lfo.connect(fwd.audio.gain(50)).connect(osc.frequency);
  osc.connect(gain).connect(fwd.audio.master);

  gain.rampTo(0.15, 0.008);
  fwd.wait(0.1);
  gain.rampTo(0, 0.2);
  fwd.wait(0.2);
  osc.tearDown();
  gain.tearDown();
}
