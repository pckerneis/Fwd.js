import { FwdAudio } from '../fwd/audio/FwdAudio';
import { Fwd } from '../fwd/Fwd';
import { Program } from '../server/DevServer.constants';

export default interface FwdRunner {
  fwd: Fwd;
  audio: FwdAudio;

  startAudioContext(): void;
  setProgram(program: Program): void;
  setFiles(files: string[]): void;
  setAutoSave(autoBuilds: boolean): void;

  reset(): void;
  build(): void;
  start(): void;
  stop(): void;
  submit(): void;
  render(duration: number, fileName: string): void;

  toggleCodeEditorVisibility(): void;
}
