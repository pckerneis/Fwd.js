import {Fwd} from './fwd';

export function init(fwd: Fwd) {
  function beepLoop(
      name: string,
      itv: number = fwd.random(0.1, 0.5)) {
    return () => {
      const fq = fwd.random(220, 440);
      beep(fq);
      fwd.schedule(itv, beepLoop(name, itv));
      fwd.log('bip', name, fq, itv);
    }
  }

  fwd.schedule(0, beepLoop('A'));
  fwd.schedule(0, beepLoop('B'));
  fwd.schedule(0, beepLoop('C'));
  fwd.schedule(0, beepLoop('D'));
  fwd.schedule(0, beepLoop('E'));
  fwd.schedule(0, beepLoop('F'));

  function beep(fq: number) {
    let osc = fwd.audio.osc(fq);
    let gain = fwd.audio.gain();
    osc.connect(gain).connect(fwd.audio.destination);

    gain.rampTo(0.035, 0.01);
    fwd.wait(0.5);
    gain.rampTo(0, 0.001);
    fwd.wait(0.02);

    fwd.schedule(0.02, () => {
      osc.nativeNode.disconnect();
      osc = null;
      gain.nativeNode.disconnect();
      gain = null;
    }, true);
  }
}
