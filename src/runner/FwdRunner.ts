import { Fwd } from '../fwd/Fwd';
import { Program } from '../server/DevServer.constants';
import { RunnerConfig } from './RunnerConfig';

export default interface FwdRunner {
  readonly config: RunnerConfig;

  readonly fwd: Fwd;

  setProgram(program: Program): void;
  setFiles(files: string[]): void;

  createNewProgram(): void;

  runCode(): void;
  start(): void;
  stop(): void;
  render(duration: number, sampleRate: number, fileName: string): void;

  toggleDarkMode(): void;
  setDarkMode(darkMode: boolean): void;
  isDarkMode(): boolean;

}
