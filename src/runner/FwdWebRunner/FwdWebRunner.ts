import { bufferToWave, downloadFile } from '../../fwd/audio/utils';
import { ContainerPanel, FlexPanel, SeparatorElement } from '../../fwd/editor/elements/FlexPanel/FlexPanel';
import { TabbedPanel } from '../../fwd/editor/elements/TabbedPanel/TabbedPanel';
import { Fwd } from '../../fwd/Fwd';
import * as FwdRuntime from '../../fwd/FwdRuntime';
import { formatTime } from '../../fwd/utils/time';
import debounce from '../../fwd/utils/time-filters/debounce';
import { DevClient } from '../../server/DevClient';
import { Program } from '../../server/DevServer.constants';
import FwdRunner from '../FwdRunner';
import { RunnerConfig } from '../RunnerConfig';
import { darkTheme, defaultTheme } from '../style.constants';
import { RunnerCodeEditor } from './components/RunnerCodeEditor';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
import { ExportPanel } from './panels/ExportPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { injectStyle } from './StyleInjector';

export enum RunnerClientState {
  disconnected = 'disconnected',
  connected = 'connected',
  codeErrors = 'codeErrors',
  upToDate = 'upToDate',
  outOfDate = 'outOfDate',
}

export default class FwdWebRunner implements FwdRunner {
  private _devClient: DevClient;
  private _reconnectionTimeout: number = 5000;

  private readonly _header: RunnerHeader;
  private readonly _footer: RunnerFooter;
  private codeEditor: RunnerCodeEditor;
  private _clientState: RunnerClientState;
  private _codeEditorSeparator: SeparatorElement;
  private _tabbedPanel: TabbedPanel;

  private _program: Program;
  private _executedCode: string;
  private _sketchIsDirty: boolean = false;
  private _codeHasErrors: boolean;
  private _isCodeEditorVisible: boolean = true;
  private _isExportPanelVisible: boolean = false;

  constructor(public readonly fwd: Fwd, public readonly config: RunnerConfig) {
    this.initDevClient();

    this._header = new RunnerHeader(this, this._devClient);
    this._footer = new RunnerFooter(this);

    this.fwd.scheduler.onEnded = () => {
      this._header.onRunnerStop();
    };

    this.buildRunner();

    this.prepareConsoleWrappers();

    if (config.darkMode) {
      this.setDarkMode(true);
    }

    // TEST
    this.toggleRightDrawerVisibility();
  }

  public setProgram(program: Program): void {
    const fileChanged = program.file !== this._program?.file;

    this._program = program;

    if (this.config.useCodeEditor) {
      this.codeEditor.setCode(program.code, fileChanged);
    }

    if (fileChanged) {
      this.reset();
      this.setDirty(false);
      this._header.setSelectedFile(program.file);
    }

    if (this.isAudioReady()) {
      this.runCode();
    }
  }

  public setFiles(files: string[]): void {
    this._header.setFiles(files);
  }

  public reset(): void {
    if (this.isSchedulerRunning()) {
      this.stop();
    }

    FwdRuntime.resetContext(this.fwd);
    this._executedCode = null;
  }

  public submit(): void {
    if (! this.config.useCodeEditor) {
      throw new Error('Cannot save when code editor is not used.');
    }

    if (this.config.writeToFile) {
      this._devClient.saveFile(this._program.file, this.codeEditor.code);
    } else {
      this._program.code = this.codeEditor.code;
      this.runCode();
    }
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
      console.error(err);
    });
  }

  public stop(): void {
    FwdRuntime.stopContext(this.fwd);
  }

  public runCode(): void {
    if (this._program?.code == null) {
      throw new Error('There\'s no program to run.');
    }

    try {
      new Function(this._program.code)(window);
      this._codeHasErrors = false;
    } catch (e) {
      this._codeHasErrors = true;
      console.error(e);
    } finally {
      this._executedCode = this._program.code;
      this.refreshState();
    }
  }

  public toggleCodeEditorVisibility(): void {
    this.setCodeEditorVisibility(! this._isCodeEditorVisible);

    // We need to manually refresh if the code editor was hidden and its content changed
    if (this._isCodeEditorVisible) {
      this.codeEditor.refresh();
    }
  }

  public toggleRightDrawerVisibility(): void {
    this.setRightDrawerVisibility(! this._isExportPanelVisible);
  }

  public isDarkMode(): boolean {
    return this.config.darkMode;
  }

  public setDarkMode(darkMode: boolean): void {
    if (!! this.codeEditor) {
      this.codeEditor.setDarkMode(darkMode);
    }

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

  private setCodeEditorVisibility(showing: boolean): void {
    this.codeEditor.htmlElement.style.display = showing ? 'flex' : 'none';
    this._codeEditorSeparator.htmlElement.style.display = showing ? '' : 'none';

    this._isCodeEditorVisible = showing;
  }

  private setRightDrawerVisibility(showing: boolean): void {
    this._tabbedPanel.htmlElement.style.display = showing ? 'flex' : 'none';
    this._isExportPanelVisible = showing;
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
    const parentFlexPanel = new FlexPanel();
    document.getElementById('fwd-runner-container').append(parentFlexPanel.htmlElement);
    parentFlexPanel.htmlElement.style.overflow = 'auto';

    const flexPanel = new FlexPanel();
    flexPanel.htmlElement.style.overflow = 'auto';

    parentFlexPanel.addFlexItem('main', flexPanel, {
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 100,
      maxWidth: 5000,
    });

    const sep = parentFlexPanel.addSeparator(0, true);
    sep.separatorSize = 5;
    sep.htmlElement.classList.add('fwd-runner-large-separator');

    if (this.config.useCodeEditor) {
      this.codeEditor = this.buildCodeEditor();

      flexPanel.addFlexItem('left', this.codeEditor, {
        minWidth: 100,
        maxWidth: 5000,
        width: 600,
        flexShrink: 0,
        flexGrow: 0,
        display: 'flex',
        flexDirection: 'column',
      });

      this._codeEditorSeparator = flexPanel.addSeparator(0, true);
      this._codeEditorSeparator.separatorSize = 10;
      this._codeEditorSeparator.htmlElement.classList.add('fwd-runner-large-separator');
    }

    const containerPanel = new ContainerPanel();
    containerPanel.htmlElement.append(this.fwd.editor.root.htmlElement);

    flexPanel.addFlexItem('center', containerPanel, {
      flexShrink: 1,
      flexGrow: 1,
      minWidth: 100,
      maxWidth: 5000,
      display: 'flex',
    });

    // tabbed panel
    this._tabbedPanel = new TabbedPanel();
    this._tabbedPanel.htmlElement.style.display = 'none';

    parentFlexPanel.addFlexItem('right', this._tabbedPanel, {
      flexGrow: 1,
      flexShrink: 0,
      minWidth: 250,
      maxWidth: 5000,
    });

    this._tabbedPanel.addTab({
      tabName: 'Settings',
      tabContent: new SettingsPanel(this),
      closeable: false,
    });

    this._tabbedPanel.addTab({
      tabName: 'Export',
      tabContent: new ExportPanel(this),
      closeable: false,
    });
  }

  private buildCodeEditor(): RunnerCodeEditor {
    const editor = new RunnerCodeEditor(this);

    editor.onchanges = debounce(() => {
      const codeChanged = ! areStringsEqualIgnoreNonSignificantWhitespaces(this._program.code, this.codeEditor.code);
      this.setDirty(codeChanged);

      if (editor.autoSaves && this.codeEditor.code !== this._executedCode) {
        this.submit();
      }
    }, 200);

    return editor;
  }

  private refreshState(): void {
    this.setClientState(this._sketchIsDirty ? RunnerClientState.outOfDate :
      (this._codeHasErrors ? RunnerClientState.codeErrors : RunnerClientState.upToDate))
  }

  private isSchedulerRunning(): boolean {
    return this.fwd.scheduler.state === 'running';
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

function areStringsEqualIgnoreNonSignificantWhitespaces(a: string, b: string): boolean {
  const escape = (s: string) => s
    .replace(/\s*/gm, ' ')
    .replace(/^\s*[\r\n]*/gm, '\n');

  return escape(a) === escape(b);
}
