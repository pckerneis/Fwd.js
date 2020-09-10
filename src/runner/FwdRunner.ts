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
  setCodeEditorVisible(visible: boolean): void;
  isCodeEditorVisible(): boolean;

  toggleRightDrawerVisibility(): void;
  setRightDrawerVisible(visible: boolean): void;
  isRightDrawerVisible(): boolean;

  toggleDarkMode(): void;
  setDarkMode(darkMode: boolean): void;
  isDarkMode(): boolean;
}
