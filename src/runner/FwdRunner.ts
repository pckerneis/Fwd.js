import { Fwd } from '../fwd/Fwd';
import { RunnerConfig } from './RunnerConfig';

export default interface FwdRunner {
  readonly config: RunnerConfig;
  readonly fwd: Fwd;

  start(): void;
  stop(): void;
  render(duration: number, sampleRate: number, fileName: string): void;

  toggleDarkMode(): void;
  setDarkMode(darkMode: boolean): void;
  isDarkMode(): boolean;
}
