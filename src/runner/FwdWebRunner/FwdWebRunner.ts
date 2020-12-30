import { bufferToWave, downloadFile } from '../../fwd/audio/utils';
import { Fwd } from '../../fwd/Fwd';
import * as FwdRuntime from '../../fwd/FwdRuntime';
import { createDomElement } from '../../fwd/utils/dom-utils';
import { Logger } from '../../fwd/utils/Logger';
import { formatTime } from '../../fwd/utils/time';
import { DevClient } from '../../server/DevClient';
import { Program } from '../../server/DevServer.constants';
import FwdRunner from '../FwdRunner';
import parentLogger from '../logger.runner';
import { RunnerConfig } from '../RunnerConfig';
import { darkTheme, defaultTheme } from '../style.constants';
import { Overlay } from './components/Overlay';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
import { PanelManager } from './panels/PanelManager';
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

  private _devClient: DevClient;
  private _reconnectionTimeout: number = 5000;

  private readonly _header: RunnerHeader;
  private readonly _footer: RunnerFooter;
  private _clientState: RunnerClientState;

  private _program: Program;
  private _executedCode: string;
  private _sketchIsDirty: boolean = false;
  private _codeHasErrors: boolean;

  private _postStopAction: Function;
  private _availableFiles: string[] = [];

  constructor(public readonly fwd: Fwd, public readonly config: RunnerConfig) {
    FwdWebRunner._sharedServices = {
      panelManager: new PanelManager(),
    };

    this.initDevClient();

    this._header = new RunnerHeader(this, this._devClient);
    this._footer = new RunnerFooter(this);

    this.buildRunner();

    this.prepareConsoleWrappers();

    if (config.darkMode) {
      this.setDarkMode(true);
    }
  }

  public static get sharedServices(): SharedServices {
    return FwdWebRunner._sharedServices;
  }

  public setProgram(program: Program): void {
    const fileChanged = program.file !== this._program?.file;

    if (fileChanged && this.isSchedulerRunning()) {
      this.handleProgramFileChangeWhileRunning(program);
    } else {
      this._program = program;

      this._header.setSelectedFile(program.file);

      if (fileChanged) {
        this.resetAndRun();
      } else if (this.isAudioReady()) {
        this.runCode();
      }
    }
  }

  public setFiles(files: string[]): void {
    this._availableFiles = files;
    this._header.setFiles(files);
  }

  public createNewProgram(): void {
    if (this.isSchedulerRunning()) {
      this.stopAndShowForceQuitOverlay().then(() => this.createNewProgram());
      return;
    }

    const message = createDomElement('span', {innerText: 'Create a new program'});
    const pathInput = createDomElement('input', {
      type: 'text',
      placeholder: 'program.js',
      style: {margin: '8px', display: 'block', padding: '5px'},
    });
    const confirmButton = createDomElement('button', {innerText: 'Confirm'});

    const overlay = new Overlay({hideWhenBackdropClicked: true, hideWhenContainerClicked: false});
    overlay.container.classList.add('fwd-runner-new-program-overlay');
    overlay.container.append(message, pathInput, confirmButton);
    overlay.show();

    confirmButton.onclick = () => {
      let path = pathInput.value.trim();

      if (path != '') {
        if (! path.endsWith('.js')) {
          path += '.js';
        }

        console.log('Create new file ' + path);

        const allFiles = [...this._availableFiles];
        allFiles.push(path);
        allFiles.sort();

        this._devClient.saveFile(path, '');
        this.setFiles(allFiles);
        this._devClient.watchFile(path);
        overlay.hide();
      }
    };
  }

  public start(): void {
    this.checkSketchCanBeStarted();

    FwdRuntime.startContext(this.fwd);

    this._header.onRunnerStart();
    this._footer.masterSlider.meter.audioSource = this.fwd.audio.master;
    this._footer.applyMasterValue();
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

      if (this._postStopAction != null) {
        this._postStopAction();
        this._postStopAction = null;
      }
    });
  }

  public runCode(): void {
    // if (this._program?.code == null) {
    //   throw new Error('There\'s no program to run.');
    // }
    //
    // try {
    //   new Function(this._program.code)(window);
    //   this._codeHasErrors = false;
    // } catch (e) {
    //   this._codeHasErrors = true;
    //   this.reportErrors(e);
    // } finally {
    //   this._executedCode = this._program.code;
    //   this.refreshState();
    // }
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

  private isAudioReady(): boolean {
    return this.fwd.audio.context != null;
  }

  private buildRunner(): void {
    this.prepareHeader();
    this.prepareFooter();
    this.buildMainSection();
  }

  private reportInfos(...infos: string[]): void {
    if (this.config.useConsoleRedirection) {
      console.info(...infos);
    } else {
      console.info(...infos);
      this._footer.print(null, ...infos);
    }
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
    document.body.append(this._footer.terminalDrawer);
    document.body.append(this._footer.htmlElement);
  }

  private prepareHeader(): void {
    document.body.prepend(this._header.htmlElement)
  }

  private initDevClient(): void {
    let retryCounter = 0;

    this._devClient = new DevClient();

    this._devClient.onFilesAvailable = (files) => {
      this.reportInfos(`Successfully connected to dev server.`);

      retryCounter = 0;

      this.setFiles(files);

      if (this._program == null) {
        this._devClient.watchFile(files[0]);
      } else {
        this._devClient.watchFile(this._program.file);
        this._header.setSelectedFile(this._program.file);
      }
    };

    this._devClient.onServerError = (errors: string[], program: Program) => {
      this.reportErrors(...errors);

      this.setProgram(program);
      this.setClientState(RunnerClientState.codeErrors);
    };

    this._devClient.onFileChange = (file: string, program: Program) => {
      this.setProgram(program);
    };

    this._devClient.onServerLost = () => {
      this.reportErrors(`Cannot reach server. Retrying in ${this._reconnectionTimeout / 1000} seconds (attempt ${++retryCounter}).`);
      this.setClientState(RunnerClientState.disconnected);

      setTimeout(() => this._devClient.connect(), this._reconnectionTimeout);
    };

    this._devClient.connect();
  }

  private setClientState(newState: RunnerClientState): void {
    this._clientState = newState;
    this._footer.setRunnerClientState(newState);
  }

  private setDirty(isDirty: boolean): void {
    if (isDirty === this._sketchIsDirty) {
      return;
    }

    this._sketchIsDirty = isDirty;
    this._header.setDirty(isDirty);

    this.refreshState();
  }

  private checkSketchCanBeStarted(): void {
    if (this._executedCode == null) {
      throw new Error('The sketch was not initialized');
    }
  }

  private buildMainSection(): void {
    FwdWebRunner.sharedServices.panelManager.buildMainSection();
  }

  private refreshState(): void {
    this.setClientState(this._sketchIsDirty ? RunnerClientState.outOfDate :
      (this._codeHasErrors ? RunnerClientState.codeErrors : RunnerClientState.upToDate))
  }

  private isSchedulerRunning(): boolean {
    return this.fwd.scheduler.state === 'running' || this.fwd.scheduler.state === 'stopping';
  }

  private resetAndRun(): void {
    FwdRuntime.resetContext(this.fwd);
    this._executedCode = null;
    this.setDirty(false);

    if (this.isAudioReady()) {
      this.runCode();
    }
  }

  private handleProgramFileChangeWhileRunning(program: Program): void {
    DBG.debug('Waiting for program to stop before changing file', program.file);

    this.stopAndShowForceQuitOverlay().then(() => this.setProgram(program));
  }

  private stopAndShowForceQuitOverlay(): Promise<void> {
    return new Promise<void>((resolve) => {
      const message = createDomElement('span', {innerText: 'Waiting for the program to stop...'});
      const quitButton = createDomElement('button', {
        innerText: 'Force quit',
        classList: ['text-button'],
        style: {marginTop: '10px'},
      });

      quitButton.onclick = () => {
        if (this.isSchedulerRunning()) {
          this.fwd.audio.master.disconnect();
          this._header.onRunnerStop();
          resolve();
        }

        overlay.hide();
      };

      const overlay = new Overlay();
      overlay.container.classList.add('fwd-runner-force-quit-overlay');
      overlay.container.append(message, quitButton);
      overlay.show();

      this._postStopAction = () => {
        resolve();
        overlay.hide();
      };

      this.stop();
    })
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
