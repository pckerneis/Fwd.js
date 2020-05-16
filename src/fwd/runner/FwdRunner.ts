import { FwdLogger } from '../core/FwdLogger';

export default interface FwdRunner {
  /**
   * A function to execute when starting a Fwd sketch
   */
  entryPoint: Function;

  /**
   * A list of strings that corresponds to callable sections of a Fwd sketch
   */
  actions: string[];

  /**
   * A simple logger
   */
  logger: FwdLogger;

  /**
   * The ESModule corresponding to the executed Fwd sketch
   */
  sketchModule: any;

  /**
   * Creates and start the audio context
   */
  startAudioContext(): void;
}
