import { FwdAudio } from '../fwd/audio/FwdAudio';
import { FwdContext } from '../fwd/core/FwdContext';
import { Program } from '../server/DevServer.constants';

export default interface FwdRunner {
  fwd: FwdContext;
  audio: FwdAudio;

  startAudioContext(): void;
  setProgram(program: Program): void;
  setFiles(files: string[]): void;
  setAutoSave(autoBuilds: boolean): void;

  reset(): void;
  build(): void;
  start(): void;
  stop(): void;
  save(): void;
  render(duration: number, fileName: string): void;

  toggleCodeEditorVisibility(): void;
}
