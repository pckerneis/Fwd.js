import { FwdAudio } from '../../fwd/audio/FwdAudio';
import { FwdAudioImpl } from '../../fwd/audio/FwdAudioImpl';
import { bufferToWave, downloadFile } from '../../fwd/audio/utils';
import { FlexPanel, SeparatorElement } from '../../fwd/editor/elements/FlexPanel/FlexPanel';
import { Fwd } from '../../fwd/Fwd';
import { clearGuiManagers } from '../../fwd/gui/Gui';
import { formatTime } from '../../fwd/utils/time';
import debounce from '../../fwd/utils/time-filters/debounce';
import { DevClient } from '../../server/DevClient';
import { Program } from '../../server/DevServer.constants';
import FwdRunner from '../FwdRunner';
import { RunnerConfig } from '../RunnerConfig';
import { RunnerCodeEditor } from './components/RunnerCodeEditor';
import { RunnerFooter } from './components/RunnerFooter';
import { RunnerHeader } from './components/RunnerHeader';
import FwdWebImpl from './FwdWebImpl';
import { injectStyle } from './StyleInjector';

export enum RunnerClientState {
  disconnected = 'disconnected',
  connected = 'connected',
  codeErrors = 'codeErrors',
  upToDate = 'upToDate',
  outOfDate = 'outOfDate',
}

export default class FwdWebRunner implements FwdRunner {
  private readonly _fwd: Fwd;
  private readonly _audio: FwdAudio;

  private readonly _header: RunnerHeader;
  private readonly _footer: RunnerFooter;

  private codeEditor: RunnerCodeEditor;

  private _audioReady: boolean;
  private _sketchWasInitialized: boolean;
  private _running: boolean;
  private _autoSave: boolean;

  private _devClient: DevClient;
  private _watchedFile: string;
  private _sketchIsDirty: boolean = false;
  private _executedCode: string;
  private _savedCode: string;
  private _clientState: RunnerClientState;
  private _dragSeparator: SeparatorElement;
  private _isCodeEditorVisible: boolean = true;

  constructor(public readonly config: RunnerConfig) {
    this._fwd = new FwdWebImpl(this);

    this._audio = new FwdAudioImpl(this._fwd.scheduler);

    this.initDevClient();

    this._header = new RunnerHeader(this, this._devClient);
    this._footer = new RunnerFooter(this);

    this._fwd.scheduler.onEnded = () => {
      this._header.onRunnerStop();
      this._running = false;
    };

    this.buildEditor();

    this.prepareConsoleWrappers();
  }

  public get fwd(): Fwd {
    return this._fwd;
  }

  public get audio(): FwdAudio {
    return this._audio;
  }

  public setProgram(program: Program): void {
    const fileChanged = program.file !== this._watchedFile;

    this._savedCode = program.code;
    this._watchedFile = program.file;

    if (this.config.useCodeEditor) {
      // TODO: Put in codeEditor... hide codeMirror !
      const cursor = this.codeEditor.codeMirror.getDoc().getCursor();
      this.codeEditor.code = program.code;

      this.setDirty(false);

      if (fileChanged) {
        this.codeEditor.codeMirror.getDoc().clearHistory();
      } else {
        this.codeEditor.codeMirror.getDoc().setCursor(cursor);
      }
    }

    if (fileChanged) {
      this.reset();
    }

    if (! this._sketchWasInitialized) {
      this.initializeSketchIfReady();
    } else {
      this.build();
    }
  }

  public setFiles(files: string[]): void {
    this._header.setFiles(files);
  }

  public setAutoSave(autoSave: boolean): void {
    this._autoSave = autoSave;
  }

  public startAudioContext(): void {
    this._audio.start();
    this._audioReady = true;
    this.initializeSketchIfReady();
    this._footer.masterSlider.meter.audioSource = this._audio.master;
  }

  public reset(): void {
    if (this._running) {
      this.stop();
    }

    this._fwd.onInit = null;
    this._fwd.onStart = null;
    this._fwd.onStop = null;
    this._fwd.editor.reset();
    this._sketchWasInitialized = false;
    this._fwd.globals = {};
    this._fwd.scheduler.resetActions();
    clearGuiManagers();
  }

  public submit(): void {
    if (! this.config.useCodeEditor) {
      throw new Error('Cannot save when code editor is not used.');
    }

    if (this.config.writeToFile) {
      this._devClient.saveFile(this._watchedFile, this.codeEditor.code);
    } else {
      this._savedCode = this.codeEditor.code;
      this.build();
    }
  }

  public start(): void {
    this.checkSketchCanBeStarted();

    this._fwd.scheduler.clearEvents();

    this._running = true;

    this.startAudioContext();
    this.fwd.onStart();
    this._fwd.scheduler.start();

    this._header.onRunnerStart();
    this._footer.applyMasterValue();
  }

  public render(duration: number, fileName: string = 'audio.wav'): void {
    this.checkSketchCanBeStarted();

    this._fwd.scheduler.clearEvents();

    this._running = true;
    const offlineContext = this._audio.startOffline(duration);
    this.fwd.onStart();
    this._fwd.scheduler.runSync(duration);
    offlineContext.startRendering().then((renderedBuffer: AudioBuffer) => {
      downloadFile(
        bufferToWave(renderedBuffer, 0, 44100 * 90),
        fileName);
    }).catch((err) => {
      console.error(err);
    });
  }

  public stop(): void {
    if (this._fwd != null) {
      this._fwd.scheduler.stop();
    }
  }

  public build(): void {
    try {
      new Function(this._savedCode)(window);

      if (! this._sketchWasInitialized) {
        if (typeof this._fwd.onInit === 'function') {
          try {
            this._fwd.onInit();
          } catch (e) {
            console.error(e);
          }
        }

        this._sketchWasInitialized = true;
      }

      this._executedCode = this._savedCode;
      this.setClientState(RunnerClientState.upToDate);
    } catch (e) {
      this.setClientState(RunnerClientState.codeErrors);
      console.error(e);
    }
  }

  public toggleCodeEditorVisibility(): void {
    this.setCodeEditorVisibility(! this._isCodeEditorVisible);

    // We need to manually refresh if the code editor was hidden and its content changed
    if (this._isCodeEditorVisible) {
      this.codeEditor.refresh();
    }
  }

  private setCodeEditorVisibility(showing: boolean): void {
    this.codeEditor.htmlElement.style.display = showing ? 'flex' : 'none';
    this._dragSeparator.htmlElement.style.display = showing ? '' : 'none';

    this._isCodeEditorVisible = showing;
  }

  //==================================================================

  private buildEditor(): void {
    this.prepareHeader();
    this.prepareFooter();
    this.buildMainSection();
  }

  private prepareConsoleWrappers(): void {
    const useWebConsole = true;

    const methodNames = ['log', 'error', 'warn', 'info'];

    const handler = {
      get: (target: any, key: any) => {
        if (methodNames.includes(key)) {
          const time = this._running ? this._fwd.scheduler.now() : null;

          if (useWebConsole) {
            return (...messages: any[]) => {
              this._footer.print(time, ...messages);

              if (time === null) {
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

          if (time != null) {
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

  private initializeSketchIfReady(): void {
    if (! this._sketchWasInitialized
      && this._savedCode != null
      && this._audioReady) {
      this.build();
    }
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
  }

  private checkSketchCanBeStarted(): void {
    if (! this._sketchWasInitialized) {
      throw new Error('The sketch was not initialized');
    }

    if (typeof this.fwd.onStart !== 'function') {
      throw new Error(`Nothing to start.`);
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

    flexPanel.addFlexItem('right', this._fwd.editor.root, {
      flexGrow: 1,
      minWidth: 100,
      maxWidth: 5000,
    });
  }

  private buildCodeEditor(): RunnerCodeEditor {
    const editor = new RunnerCodeEditor(this);

    editor.codeMirror.on('changes', debounce(() => {
      const codeChanged = this.codeEditor.code !== this._savedCode;

      if (this._clientState !== RunnerClientState.codeErrors) {
        if (codeChanged) {
          this.setClientState(codeChanged ? RunnerClientState.outOfDate : RunnerClientState.upToDate);
        }
      }

      this.setDirty(codeChanged);

      if (this._autoSave && this.codeEditor.code !== this._executedCode) {
        this.submit();
      }
    }, 200));

    return editor;
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
