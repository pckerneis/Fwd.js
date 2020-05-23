import { FwdLogger } from '../core/FwdLogger';

export default interface FwdRunner {
  /**
   * A simple logger
   */
  logger: FwdLogger;

  /**
   * Creates and start the audio context
   */
  startAudioContext(): void;

  buildEditor(): void;

  setSketch(newSketch: Function): void;
}
