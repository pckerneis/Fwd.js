import {Fwd} from './fwd';

export function init(fwd: Fwd) {
  for (let i = 0; i < 5; ++i) {
    fwd.schedule(i * 5, loop);
  }

  function loop() {
    const fq = fwd.random(220, 880);
    const itv = fwd.random(0.1, 0.5);

    beep(fq);
    fwd.schedule(itv, loop);
  }

  function beep(fq: number) {
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
}
