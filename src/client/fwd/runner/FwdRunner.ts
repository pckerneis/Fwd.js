import { FwdAudio } from '../audio/FwdAudio';
import { Fwd } from '../core/fwd';

export default interface FwdRunner {
  fwd: Fwd;
  audio: FwdAudio;

  startAudioContext(): void;
  setSketchCode(newSketch: string): void;
  setFiles(files: string[]): void;
  setAutoBuilds(autoBuilds: boolean): void;

  reset(): void;
  build(): void;
  start(): void;
  stop(): void;
  save(): void;
  render(duration: number, fileName: string): void;
}
