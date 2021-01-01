import { bufferToWave, downloadFile } from '../../fwd/audio/utils';
import { Fwd } from '../../fwd/Fwd';
import * as FwdRuntime from '../../fwd/FwdRuntime';
import { Logger } from '../../fwd/utils/Logger';
import { formatTime } from '../../fwd/utils/time';
import FwdRunner from '../FwdRunner';
import parentLogger from '../logger.runner';
import { RunnerConfig } from '../RunnerConfig';
import { darkTheme, defaultTheme } from '../style.constants';
import { commandManager } from './commands/command-manager';
import {
  addConnection,
  createAndAddInitNode,
  createAndAddMidiClipNode,
  registerGraphSequencerCommands,
} from './commands/graph-sequencer.commands';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
import { PanelManager } from './panels/PanelManager';
import { GraphSequencerService } from './services/graph-sequencer.service';
import { PlaybackService } from './services/playback.service';
import { MidiNoteState } from './state/project.state';
import { injectStyle } from './StyleInjector';

interface SharedServices {
  panelManager: PanelManager;
}

const DBG = new Logger('FwdWebRunner', parentLogger);

export enum RunnerClientState {
  disconnected = 'disconnected',
  connected = 'connected',
  codeErrors = 'codeErrors',
  upToDate = 'upToDate',
  outOfDate = 'outOfDate',
}

export default class FwdWebRunner implements FwdRunner {

  private static _sharedServices: SharedServices;

  private _header: RunnerHeader;
  private _footer: RunnerFooter;
  private _playbackService: PlaybackService;
  private _graphSequencerService: GraphSequencerService;

  constructor(public readonly fwd: Fwd, public readonly config: RunnerConfig) {
    this._graphSequencerService = new GraphSequencerService({
      connections: [],
      nodes: [],
    });

    this._playbackService = new PlaybackService(this._graphSequencerService);

    FwdWebRunner._sharedServices = {
      panelManager: new PanelManager(),
    };

    this.buildRunner();
    this.prepareConsoleWrappers();

    if (config.darkMode) {
      this.setDarkMode(true);
    }

    // TEST INIT
    registerGraphSequencerCommands(this._graphSequencerService);

    commandManager.perform(createAndAddInitNode({
      kind: 'Init',
      id: '1',
      bounds: {x: 2, y: 2, width: 120, height: 24},
      label: 'start',
    }));

    const noteDefault: MidiNoteState = {
      initialVelocity: 0, initialStart: 0, hidden: false, tempDuration: null, selected: false,
      time: 0, duration: 0, velocity: 0, pitch: 0,
    };

    commandManager.perform(createAndAddMidiClipNode({
      id: '2',
      kind: 'MidiClip',
      duration: 4,
      timeSignature: {upper: 4, lower: 4},
      notes: [
        {...noteDefault, time: 0, duration: 1, pitch: 65, velocity: 120},
        {...noteDefault, time: 1, duration: 1, pitch: 67, velocity: 110},
        {...noteDefault, time: 2, duration: 1, pitch: 69, velocity: 100},
      ],
      flags: [
        {id: '1', kind: 'inlet', time: 0, color: 'grey', name: 'in'},
        {id: '2', kind: 'outlet', time: 4, color: 'grey', name: 'out'},
      ],
      label: 'node1',
      bounds: {x: 210, y: 4, width: 120, height: 20},
    }));

    commandManager.perform(createAndAddMidiClipNode({
      id: '3',
      kind: 'MidiClip',
      duration: 4,
      timeSignature: {upper: 4, lower: 4},
      notes: [
        {...noteDefault, time: 0, duration: 1, pitch: 65, velocity: 120},
        {...noteDefault, time: 1, duration: 1, pitch: 67, velocity: 110},
        {...noteDefault, time: 2, duration: 1, pitch: 69, velocity: 100},
      ],
      flags: [
        {id: '3', kind: 'inlet', time: 0, color: 'grey', name: 'in'},
        {id: '4', kind: 'outlet', time: 4, color: 'grey', name: 'out'},
      ],
      label: 'node2',
      bounds: {x: 210, y: 50, width: 120, height: 20},
    }));

    commandManager.perform(addConnection({
      sourceNode: '1',
      sourcePinId: '0',
      targetNode: '2',
      targetPinId: '1',
    }));

    commandManager.perform(addConnection({
      sourceNode: '2',
      sourcePinId: '2',
      targetNode: '3',
      targetPinId: '3',
    }));

    commandManager.perform(addConnection({
      sourceNode: '3',
      sourcePinId: '4',
      targetNode: '2',
      targetPinId: '1',
    }));
  }

  public static get sharedServices(): SharedServices {
    return FwdWebRunner._sharedServices;
  }

  public start(): void {
    this.checkSketchCanBeStarted();

    FwdRuntime.startContext(this.fwd);

    this._header.onRunnerStart();
    this._footer.masterSlider.meter.audioSource = this.fwd.audio.master;
    this._footer.applyMasterValue();

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
    FwdWebRunner.sharedServices.panelManager.buildMainSection(this._graphSequencerService);
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
