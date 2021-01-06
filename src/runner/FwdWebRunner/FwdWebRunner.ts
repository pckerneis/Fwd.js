import { bufferToWave, downloadFile } from '../../fwd/audio/utils';
import { Fwd } from '../../fwd/Fwd';
import * as FwdRuntime from '../../fwd/FwdRuntime';
import { Logger } from '../../fwd/utils/Logger';
import { formatTime } from '../../fwd/utils/time';
import FwdRunner from '../FwdRunner';
import parentLogger from '../logger.runner';
import { RunnerConfig } from '../RunnerConfig';
import { darkTheme, defaultTheme } from '../style.constants';
import { registerGraphSequencerCommands } from './commands/graph-sequencer.commands';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
import { PanelManager } from './panels/PanelManager';
import { GraphSequencerService } from './services/graph-sequencer.service';
import { PlaybackService } from './services/playback.service';
import { ProjectFileService } from './services/project-file.service';
import { injectStyle } from './StyleInjector';

const DBG = new Logger('FwdWebRunner', parentLogger);

export enum RunnerClientState {
  disconnected = 'disconnected',
  connected = 'connected',
  codeErrors = 'codeErrors',
  upToDate = 'upToDate',
  outOfDate = 'outOfDate',
}

export default class FwdWebRunner implements FwdRunner {
  private _header: RunnerHeader;
  private _footer: RunnerFooter;

  private readonly _panelManager: PanelManager;
  private readonly _playbackService: PlaybackService;
  private readonly _graphSequencerService: GraphSequencerService;
  private readonly _projectService: ProjectFileService;

  constructor(public readonly fwd: Fwd, public readonly config: RunnerConfig) {
    this._graphSequencerService = new GraphSequencerService({
      connections: [],
      nodes: [],
    });

    this._playbackService = new PlaybackService(this._graphSequencerService);
    this._panelManager = new PanelManager();
    this._projectService = new ProjectFileService(this._graphSequencerService, this._panelManager);

    this.buildRunner();
    this.prepareConsoleWrappers();

    if (config.darkMode) {
      this.setDarkMode(true);
    }

    registerGraphSequencerCommands(this._graphSequencerService);
  }

  public start(): void {
    this.checkSketchCanBeStarted();

    FwdRuntime.startContext(this.fwd);

    this._header.onRunnerStart();

    if (this.fwd.audio.master) {
      this._footer.masterSlider.meter.audioSource = this.fwd.audio.master;
      this._footer.applyMasterValue();
    }

    DBG.debug('Starting playback');
    this._playbackService.startPlayback(this.fwd.scheduler);
  }

  public render(duration: number, sampleRate: number, fileName: string): void {
    this.checkSketchCanBeStarted();

    FwdRuntime.renderOffline(this.fwd, duration, sampleRate)
      .then((renderedBuffer: AudioBuffer) => {
        downloadFile(
          bufferToWave(renderedBuffer, 0, sampleRate * duration),
          fileName);
      }).catch((err) => {
      this.reportErrors(err);
    });
  }

  public stop(): void {
    FwdRuntime.stopContext(this.fwd, () => {
      this._header.onRunnerStop();
    });
  }

  public save(): void {
    const jsonState = this._projectService.getStateAsJson();
    this._projectService.saveInteractive(jsonState);
  }

  public openInteractive(): void {
    this._projectService.loadInteractive();
  }

  public isDarkMode(): boolean {
    return this.config.darkMode;
  }

  public setDarkMode(darkMode: boolean): void {
    if (darkMode) {
      document.body.classList.add('fwd-runner-dark-mode');
    } else {
      document.body.classList.remove('fwd-runner-dark-mode');
    }

    this.config.darkMode = darkMode;
  }

  public toggleDarkMode(): void {
    this.setDarkMode(! this.config.darkMode);
  }

  private buildRunner(): void {
    this.prepareHeader();
    this.prepareFooter();
    this.buildMainSection();
  }

  private reportErrors(...errors: string[]): void {
    if (this.config.useConsoleRedirection) {
      console.error(...errors);
    } else {
      console.error(...errors);
      this._footer.print(null, ...errors);
    }
  }

  private prepareConsoleWrappers(): void {
    const methodNames = ['log', 'error', 'warn', 'info'];

    const handler = {
      get: (target: any, key: any) => {
        if (methodNames.includes(key)) {
          const time = this.isSchedulerRunning() ? this.fwd.scheduler.now() : null;
          const shouldShowTime = this.config.useConsoleTimePrefix && time != null;

          if (this.config.useConsoleRedirection) {
            return (...messages: any[]) => {
              this._footer.print(time, ...messages);

              if (! shouldShowTime) {
                Reflect.get(target, key)(...messages);
              } else {
                const timeStr = formatTime(time);

                Reflect.get(target, key)(
                  `%c[${timeStr}]`,
                  'font-weight:bold; color:grey;',
                  ...messages,
                );
              }
            }
          }

          if (shouldShowTime) {
            return Function.prototype.bind.call(
              Reflect.get(target, key),   // Original method
              target,                     // ... on original console
              `%c[${formatTime(time)}]`,
              'font-weight:bold; color:grey;',
            );
          }
        }

        // Just return the original thing
        return Reflect.get(target, key);
      },
    };

    const proxyObject = new Proxy(window.console, handler);

    Object.defineProperty(window, 'console', {
      get: () => {
        return proxyObject;
      },
    });
  }

  private prepareFooter(): void {
    this._footer = new RunnerFooter(this);
    document.body.append(this._footer.terminalDrawer);
    document.body.append(this._footer.htmlElement);
  }

  private prepareHeader(): void {
    this._header = new RunnerHeader(this);
    document.body.prepend(this._header.htmlElement)
  }

  private checkSketchCanBeStarted(): void {
  }

  private buildMainSection(): void {
    this._panelManager.buildMainSection(this._graphSequencerService);
  }

  private isSchedulerRunning(): boolean {
    return this.fwd.scheduler.state === 'running' || this.fwd.scheduler.state === 'stopping';
  }
}

injectStyle('FwdWebRunner', `
.fwd-runner-one-line-logger {
  font-family: monospace;
  margin: auto 0 auto 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fwd-runner-large-separator {
  border-left: solid 1px ${defaultTheme.border};
  border-right: solid 1px ${defaultTheme.border};
}

.fwd-runner-large-hseparator {
  border-top: solid 1px ${defaultTheme.border};
  border-bottom: solid 1px ${defaultTheme.border};
}

.fwd-runner-force-quit-overlay {
    padding: 12px;
    align-items: center;
    display: flex;
    flex-direction: column;
}

.fwd-runner-new-program-overlay {
    padding: 12px;
    align-items: center;
    display: flex;
    flex-direction: column;
}
`);

injectStyle('FwdWebRunner_DarkMode', `
.fwd-runner-dark-mode {
  background: ${darkTheme.bgPrimary};
  color: ${darkTheme.textColor};
}

.fwd-runner-dark-mode .fwd-flex-panel-separator {
  background: ${darkTheme.bgSecondary};
}

.fwd-runner-dark-mode .fwd-flex-panel-separator.draggable:hover {
  background: ${darkTheme.bgSecondary};
}

.fwd-runner-dark-mode .fwd-icon-button {
  filter: invert(100%);
}

.fwd-runner-dark-mode input[type="number"],
.fwd-runner-dark-mode input[type="text"] {
  background: ${darkTheme.bgPrimary};
  color: ${darkTheme.textColor};
  border: 1px solid ${darkTheme.textColor};
  border-radius: 2px;
}

.fwd-runner-dark-mode select option {
    background: ${darkTheme.bgPrimary};
}

.fwd-runner-dark-mode .fwd-runner-large-separator {
  border-left: solid 1px ${darkTheme.border};
  border-right: solid 1px ${darkTheme.border};
}
`);
