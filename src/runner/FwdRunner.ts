import { FwdAudio } from '../fwd/audio/FwdAudio';
import { Fwd } from '../fwd/Fwd';
import { Program } from '../server/DevServer.constants';
import { RunnerConfig } from './RunnerConfig';

export default interface FwdRunner {
  config: RunnerConfig;

  fwd: Fwd;
  audio: FwdAudio;

  startAudioContext(): void;
  setProgram(program: Program): void;
  setFiles(files: string[]): void;
  setAutoSave(autoBuilds: boolean): void;

  reset(): void;
  runCode(): void;
  start(): void;
  stop(): void;
  submit(): void;
  render(duration: number, fileName: string): void;

  toggleCodeEditorVisibility(): void;
}
