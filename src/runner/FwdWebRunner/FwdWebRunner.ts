import { bufferToWave, downloadFile } from '../../fwd/audio/utils';
import { FlexPanel, SeparatorElement } from '../../fwd/editor/elements/FlexPanel/FlexPanel';
import { Fwd } from '../../fwd/Fwd';
import * as FwdRuntime from '../../fwd/FwdRuntime';
import { formatTime } from '../../fwd/utils/time';
import debounce from '../../fwd/utils/time-filters/debounce';
import { DevClient } from '../../server/DevClient';
import { Program } from '../../server/DevServer.constants';
import FwdRunner from '../FwdRunner';
import { RunnerConfig } from '../RunnerConfig';
import { RunnerCodeEditor } from './components/RunnerCodeEditor';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
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

  private readonly _header: RunnerHeader;
  private readonly _footer: RunnerFooter;
  private codeEditor: RunnerCodeEditor;
  private _clientState: RunnerClientState;
  private _dragSeparator: SeparatorElement;

  private _program: Program;
  private _executedCode: string;
  private _sketchIsDirty: boolean = false;
  private _isCodeEditorVisible: boolean = true;
  private _codeHasErrors: boolean;

  constructor(public readonly fwd: Fwd, public readonly config: RunnerConfig) {
    this.initDevClient();

    this._header = new RunnerHeader(this, this._devClient);
    this._footer = new RunnerFooter(this);

    this.fwd.scheduler.onEnded = () => {
      this._header.onRunnerStop();
    };

    this.buildRunner();

    this.prepareConsoleWrappers();
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

  public render(duration: number, fileName: string = 'audio.wav'): void {
    this.checkSketchCanBeStarted();

    FwdRuntime.renderOffline(this.fwd, duration)
      .then((renderedBuffer: AudioBuffer) => {
        downloadFile(
          bufferToWave(renderedBuffer, 0, 44100 * 90),
          fileName);
      }).catch((err) => {
      console.error(err);
    });
  }

  public stop(): void {
    FwdRuntime.stopContext(this.fwd);
  }

  public runCode(): void {
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

  //==================================================================

  private isAudioReady(): boolean {
    return this.fwd.audio.context != null;
  }

  private setCodeEditorVisibility(showing: boolean): void {
    this.codeEditor.htmlElement.style.display = showing ? 'flex' : 'none';
    this._dragSeparator.htmlElement.style.display = showing ? '' : 'none';

    this._isCodeEditorVisible = showing;
  }

  private buildRunner(): void {
    this.prepareHeader();
    this.prepareFooter();
    this.buildMainSection();
  }

  private reportError(error: string): void {
    if (this.config.useConsoleRedirection) {
      console.error(error);
    } else {
      console.error(error);
      this._footer.print(null, error);
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
    this._devClient = new DevClient();

    this._devClient.onFilesAvailable = (files) => {
      this.setFiles(files);
      this._devClient.watchFile(files[0]);
    };

    this._devClient.onServerError = (errors: string[], program: Program) => {
      console.error(...errors);
      this._footer.print(null, ...errors);

      this.setProgram(program);
      this.setClientState(RunnerClientState.codeErrors);
    };

    this._devClient.onFileChange = (file: string, program: Program) => {
      this.setProgram(program);
    };

    this._devClient.onServerLost = () => {
      console.error('Connection with server lost');
      this._footer.print(null, 'Connection with server lost');
      this.setClientState(RunnerClientState.disconnected);
    };
  }

  private setClientState(newState: RunnerClientState): void {
    this._clientState = newState;
    this._header.setRunnerClientState(newState);
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
    const flexPanel = new FlexPanel();
    document.getElementById('fwd-runner-container').append(flexPanel.htmlElement);

    if (this.config.useCodeEditor) {
      this.codeEditor = this.buildCodeEditor();

      flexPanel.addFlexItem('left', this.codeEditor, {
        minWidth: 100,
        maxWidth: 5000,
        width: 600,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      });

      this._dragSeparator = flexPanel.addSeparator(0, true);
      this._dragSeparator.separatorSize = 10;
      this._dragSeparator.htmlElement.classList.add('fwd-runner-large-separator');
    }

    flexPanel.addFlexItem('right', this.fwd.editor.root, {
      flexGrow: 1,
      minWidth: 100,
      maxWidth: 5000,
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
  border-left: solid 1px #00000015;
  border-right: solid 1px #00000015;
}
`);

function areStringsEqualIgnoreNonSignificantWhitespaces(a: string, b: string): boolean {
  const escape = (s: string) => s
    .replace(/\s*/gm, ' ')
    .replace(/^\s*[\r\n]*/gm, '\n');

  return escape(a) === escape(b);
}
