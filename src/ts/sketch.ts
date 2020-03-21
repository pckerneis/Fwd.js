import {Fwd} from './fwd';

export function init(fwd: Fwd) {
  function loopA() {
    fwd.log('A', fwd.now());
    fwd.schedule(1, loopA);
  }
  
  function loopB() {
    fwd.log('B', fwd.now());
    fwd.schedule(0.568, loopB);
  }
  
  loopA();
  fwd.schedule(2.5, loopB);
}