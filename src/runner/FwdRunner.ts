import { FwdAudio } from '../fwd/audio/FwdAudio';
import { Fwd } from '../fwd/Fwd';
import { Program } from '../server/DevServer.constants';
import { RunnerConfig } from './RunnerConfig';

export default interface FwdRunner {
  config: RunnerConfig;

  fwd: Fwd;

  setProgram(program: Program): void;
  setFiles(files: string[]): void;

  reset(): void;
  runCode(): void;
  start(): void;
  stop(): void;
  submit(): void;
  render(duration: number, sampleRate: number, fileName: string): void;

  toggleCodeEditorVisibility(): void;
  toggleExportPanelVisibility(): void;
  toggleDarkMode(): void;
  setDarkMode(darkMode: boolean): void;
}
