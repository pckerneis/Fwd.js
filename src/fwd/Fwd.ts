import { FwdAudio } from "./audio/FwdAudio";
import { FwdGui } from './gui/Gui';
import { FwdMidi } from './midi/FwdMidi';
import { FwdScheduler } from './scheduler/FwdScheduler';

/**
 * Provides useful references to the main actors of a FWD program e.g. the scheduler or the audio module.
 * It also defines life cycle hooks for the program such as 'onInit' or 'onStart'.
 */
export interface Fwd {
  /**
   * The {@link FwdScheduler}.
   */
  readonly scheduler: FwdScheduler;

  /**
   * The {@link FwdAudio} module.
   */
  readonly audio: FwdAudio;

  /**
   * The {@link FwdGui} module.
   */
  readonly gui: FwdGui;

  /**
   * The {@link FwdMidi} module.
   */
  readonly midi: FwdMidi;

  /**
   * The {@link FwdUtils} module.
   */
  readonly utils: FwdUtils;

  /**
   * Start life cycle hook. A program may be started more than once.
   */
  onStart?: Function;

  /**
   * Stop life cycle hook.
   */
  onStop?: Function;
}

export interface FwdUtils {
  map(value: number,
      sourceMin: number, sourceMax: number,
      targetMin: number, targetMax: number): number;

  parseNumber(str: any): number;

  clamp(value: number, a: number, b: number): number;

  random(a?: number, b?: number): number;

  simplex(x: number, y: number, z?: number, w?: number): number;
}
