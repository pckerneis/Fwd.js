export default interface FwdRunner {

  onSketchFileChange: (newSketchFile: string) => void;

  /**
   * Creates and start the audio context
   */
  startAudioContext(): void;

  buildEditor(): void;

  setSketchCode(newSketch: string): void;

  setFiles(files: string[]): void;

  reset(): void;
}
