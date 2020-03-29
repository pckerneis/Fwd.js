import {fwd} from './fwd';

fwd.controls.addSlider('kickTune', {
  defaultValue: 42,
  min: 20,
  max: 200,
  step: 0.1
});

let sampler: any;

export function playSample() {
  sampler.play();
}

export function init(): void {
  fwd.log('ready');
  sampler = fwd.audio.sampler('Brushed_bell.wav').connectToMaster();
}

export function kick(): void {
  fwd.log('kick');
  const baseFreq = fwd.controls.getSlider('kickTune').value;

  const osc = fwd.audio.osc(baseFreq * 5);
  const gain = fwd.audio.gain();

  osc.connect(gain).connectToMaster();

  gain.rampTo(1, 0.01);
  osc.frequency.rampTo(baseFreq, 0.03);

  fwd.wait(0.1);
  gain.rampTo(0, 0.3);

  fwd.wait(1);
  gain.tearDown();
  osc.tearDown();

  // fwd.schedule(0, kick);
}
