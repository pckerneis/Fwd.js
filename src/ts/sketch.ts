import {Fwd} from './fwd';

let ctx: AudioContext = null;

export function init(fwd: Fwd) {
  ctx = new AudioContext();

  function beepLoop(name: string, fq: number = 440, itv: number = 0.5) {
    return () => {
      beep(fq);
      fwd.schedule(itv, beepLoop(name, fq, itv));
      fwd.log('bip', name, fq, itv);
    }
  }

  beepLoop('A')();
  fwd.schedule(2, beepLoop('B', 660, 0.495));
  fwd.schedule(8, beepLoop('C', 220, 0.475));
  fwd.schedule(10, beepLoop('D', 110, 0.492));
  fwd.schedule(15, beepLoop('E', 100, 0.542));

  function beep(fq: number = 440) {
    let osc = ctx.createOscillator();
    osc.frequency.value = fq;

    let gain = ctx.createGain();
  
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.035, fwd.now() + 0.001);
  
    fwd.schedule(0.2, () => {
      gain.gain.linearRampToValueAtTime(0, fwd.now() + 0.001);

      fwd.schedule(0.2, () => {
        osc.stop();
        osc.disconnect();
        osc = null;
        gain.disconnect();
        gain = null;
      }, true);
    }, true);
  }
}
