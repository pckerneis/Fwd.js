import { FwdAudio } from '../api/audio/FwdAudio';
import { FwdContext } from '../api/core/FwdContext';

export default interface FwdRunner {
  fwd: FwdContext;
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
