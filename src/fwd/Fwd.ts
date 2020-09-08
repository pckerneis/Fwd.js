import { FwdAudio } from "./audio/FwdAudio";
import { FwdEditor } from "./editor/FwdEditor";
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
  scheduler: FwdScheduler;

  /**
   * The {@link FwdAudio} module.
   */
  audio: FwdAudio;

  /**
   * The {@link FwdEditor} module.
   */
  editor: FwdEditor;

  /**
   * The {@link FwdGui} module.
   */
  gui: FwdGui;

  /**
   * The {@link FwdMidi} module.
   */
  midi: FwdMidi;

  /**
   * The {@link FwdUtils} module.
   */
  utils: FwdUtils;

  /**
   * A 'bag' to persist things on...
   */
  globals: any;

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