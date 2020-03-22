import { SliderOptions } from '../control/FwdControl';
import { Fwd } from '../core/fwd';
import { FwdLogger } from '../core';

export default interface FwdRunner {
  fwdInstance: Fwd;
  fwdLogger: FwdLogger;

  entryPoint: Function;

  onSessionStart(): void;
  onSessionStop(): void;

  sliderAdded(name: string, options: SliderOptions): void;
}
