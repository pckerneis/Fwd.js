import { FwdAudio } from '../audio/FwdAudio';

export default interface FwdRunner {
  audio: FwdAudio;

  /**
   * Creates and start the audio context
   */
  startAudioContext(): void;

  buildEditor(): void;

  setSketchCode(newSketch: string): void;

  setFiles(files: string[]): void;

  reset(): void;
}
