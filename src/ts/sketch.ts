import {fwd} from './fwd';

const sample = fwd.audio.sampler('Brushed_bell.wav').connectToMaster();

export function playSample() {
  sample.play();
}

export function init(): void {
  fwd.log('ready');
}

export function kick(): void {
  fwd.log('kick');

  const osc = fwd.audio.osc(300);
  const gain = fwd.audio.gain();

  osc.connect(gain).connectToMaster();

  gain.rampTo(1, 0.008);
  osc.frequency.rampTo(42, 0.03);

  fwd.wait(0.1);
  gain.rampTo(0, 0.3);

  fwd.wait(1);
  gain.tearDown();
  osc.tearDown();

  fwd.schedule(0, kick);
}
