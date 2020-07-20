import { FwdAudio } from "../audio/FwdAudio";
import { Editor } from "../editor/Editor";
import { FwdScheduler } from './FwdScheduler';

/**
 * Provides useful references to the main actors of a FWD program e.g. the scheduler or the audio module.
 * It also defines life cycle hooks for the program such as 'onInit' or 'onStart'.
 */
export interface FwdContext {
  /**
   * The {@link FwdScheduler}.
   */
  scheduler: FwdScheduler;

  /**
   * The {@link FwdAudio} module.
   */
  audio?: FwdAudio;

  /**
   * The {@link Editor} module.
   */
  editor?: Editor;

  /**
   * A 'bag' to persist things on...
   */
  globals: any;

  /**
   * Life cycle hook for the program initialization.
   */
  onInit?: Function;

  /**
   * Start life cycle hook. A program may be started more than once.
   */
  onStart?: Function;

  /**
   * Stop life cycle hook.
   */
  onStop?: Function;
}
