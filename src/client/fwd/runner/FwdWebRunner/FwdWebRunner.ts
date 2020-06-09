import { DevClient } from '../../../../server/DevClient';
import { FwdAudio } from '../../audio/FwdAudio';
import { FwdAudioImpl } from '../../audio/FwdAudioImpl';
import { fwd, Fwd, putFwd } from '../../core/fwd';
import { FlexPanel } from '../../editor/elements/FlexPanel/FlexPanel';
import { parseNumber } from '../../utils/numbers';
import { formatTime } from '../../utils/time';
import audit from '../../utils/time-filters/audit';
import debounce from '../../utils/time-filters/debounce';
import FwdRunner from '../FwdRunner';
import { ControlBindingManager } from './components/BindableController';
import { FwdWebConsole } from './components/Console';
import { IconButton } from './components/IconButton';
import { MasterSlider } from './components/MasterSlider';
import { RunnerCodeEditor } from './components/RunnerCodeEditor';
import { RunnerHeader } from './components/RunnerHeader';
import FwdWebImpl from './FwdWebImpl';
import { injectStyle } from './StyleInjector';

const masterSliderId = 'master-slider';
const footerId = 'fwd-runner-footer';
const terminalDrawerId = 'fwd-runner-terminal-drawer';

export type RunnerCodeExecutionState = 'up-to-date' | 'out-of-date' | 'code-errors';

class AbstractWebRunner implements FwdRunner {
  private readonly _fwd: Fwd;
  private readonly _audio: FwdAudio;

  private readonly _header: RunnerHeader;

  private readonly _terminalDrawer: HTMLElement;
  private _oneLineLogger: HTMLLabelElement;
  private _masterSlider: MasterSlider;
  private codeEditor: RunnerCodeEditor;

  private _currentCode: string;
  private _audioReady: boolean;
  private _sketchWasInitialized: boolean;
  private _running: boolean;
  private _autoBuilds: boolean;

  private readonly _sandboxProxies: WeakMap<any, any> = new WeakMap();

  private _devClient: DevClient;
  private _watchedFile: string;
  private _sketchIsDirty: boolean = false;
  private _executedCode: string;
  private _savedCode: string;

  constructor() {
    this._fwd = new FwdWebImpl(this);

    this._audio = new FwdAudioImpl();
    this._audio.initializeModule(this._fwd);

    this.initDevClient();

    this._header = new RunnerHeader(this, this._devClient);

    this._terminalDrawer = document.getElementById(terminalDrawerId);
    this._terminalDrawer.style.display = 'none';

    this._fwd.scheduler.onEnded = () => {
      this._header.onRunnerStop();
      this._running = false;
    };

    putFwd(this._fwd);

    this.buildEditor();
  }

  public get fwd(): Fwd {
    return this._fwd;
  }

  public get audio(): FwdAudio {
    return this._audio;
  }

  public setSketchCode(newSketch: string): void {
    this._currentCode = newSketch;
    this.codeEditor.code = newSketch;
    this._savedCode = newSketch;
    this.setDirty(false);

    if (this._sketchWasInitialized && this._autoBuilds) {
      this.build();
    } else {
      this.initializeSketchIfReady();
    }
  }

  public setFiles(files: string[]): void {
    this._header.setFiles(files);
  }

  public setAutoBuilds(autoBuilds: boolean): void {
    this._autoBuilds = autoBuilds;
  }

  public startAudioContext(): void {
    this._audio.start();
    this._audioReady = true;
    this.initializeSketchIfReady();
    this._masterSlider.meter.audioSource = this._audio.master;
  }

  public reset(): void {
    if (this._running) {
      this.stop();
    }

    this._fwd.onInit = null;
    this._fwd.onStart = null;
    this._fwd.onStop = null;
    this._fwd.editor.reset();
    this._currentCode = null;
    this._sketchWasInitialized = false;
    this._fwd.globals = {};
    this._fwd.scheduler.resetActions();
  }

  public save(): void {
    this._currentCode = this.codeEditor.code;
    this._devClient.saveFile(this._watchedFile, this._currentCode);
  }

  public start(): void {
    if (! this._sketchWasInitialized) {
      throw new Error('The sketch was not initialized');
    }

    if (typeof fwd.onStart !== 'function') {
      console.error(null, `Nothing to start.`);
      return;
    }

    this._header.onRunnerStart();

    this._fwd.scheduler.clearEvents();

    ControlBindingManager.getInstance().clearCurrentControllers();

    this._running = true;

    this._audio.start();
    fwd.onStart();
    this._fwd.scheduler.start();

    this.applyMasterValue();
  }

  public stop(): void {
    if (this._fwd != null) {
      this._fwd.scheduler.stop();
    }
  }

  public build(): void {
    if (this._currentCode == null) {
      throw new Error('The sketch could not be executed');
    }

    try {
      this.compileCode(this.codeEditor.code)(window);

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

      this._executedCode = this._currentCode;
      this._header.setSyncState('up-to-date');
    } catch (e) {
      this._header.setSyncState('code-errors');
      console.error(e);
    }
  }

  //==================================================================

  private buildEditor(): void {
    this.prepareHeader();
    this.prepareFooter();

    const flexPanel = new FlexPanel();
    this.codeEditor = new RunnerCodeEditor();

    this.codeEditor.codeMirror.on('changes', debounce(() => {
      if (this.codeEditor.code !== this._executedCode) {
        this._header.setSyncState('out-of-date');
      } else {
        this._header.setSyncState('up-to-date')
      }

      this.setDirty(this.codeEditor.code !== this._savedCode);

      if (this._autoBuilds) {
        this.build();
      }
    }, 200));

    flexPanel.addFlexItem('left', this.codeEditor, {
      minWidth: 100,
      maxWidth: 5000,
      width: 600,
      flexShrink: 0,
    });

    const separator = flexPanel.addSeparator(0, true);
    separator.separatorSize = 10;
    separator.htmlElement.classList.add('fwd-runner-large-separator');

    flexPanel.addFlexItem('right', this._fwd.editor.root, {
      flexGrow: 1,
      minWidth: 100,
      maxWidth: 5000,
    });

    document.getElementById('fwd-runner-container')
      .append(flexPanel.htmlElement);
  }

  private prepareConsole(): void {
    const webConsole: FwdWebConsole = new FwdWebConsole(this._fwd);
    document.getElementById(terminalDrawerId).append(webConsole.htmlElement);

    const useWebConsole = true;

    const methodNames = ['log', 'error', 'warn', 'info'];

    const handler = {
      get: (target: any, key: any) => {
        if (methodNames.includes(key)) {
          const time = this._running ? this._fwd.now() : null;

          if (useWebConsole) {
            return (...messages: any[]) => {
              webConsole.print(time, ...messages);

              if (time === null) {
                this._oneLineLogger.innerText = messages[messages.length - 1];

                Reflect.get(target, key)(...messages);

              } else {
                const timeStr = formatTime(time);

                this._oneLineLogger.innerText = timeStr + ' ' + messages[messages.length - 1];

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

  private toggleTerminalDrawer(): void {
    if (this._terminalDrawer.style.display === 'none') {
      this._terminalDrawer.style.display = 'flex';
      this._oneLineLogger.style.display = 'none';
    } else {
      this._terminalDrawer.style.display = 'none';
      this._oneLineLogger.style.display = 'block';
    }
  }

  private prepareFooter(): void {
    this._oneLineLogger = document.createElement('label');
    this._oneLineLogger.classList.add('fwd-runner-one-line-logger');
    this._oneLineLogger.style.cursor = 'default';

    const terminalButton = new IconButton('terminal');
    terminalButton.htmlElement.id = 'terminal-drawer-toggle';
    this._oneLineLogger.htmlFor = terminalButton.htmlElement.id;
    terminalButton.htmlElement.onclick = () => this.toggleTerminalDrawer();

    const footer = document.getElementById(footerId);
    footer.append(terminalButton.htmlElement);
    footer.append(this._oneLineLogger);

    this.prepareConsole();

    this._masterSlider = new MasterSlider();
    this._masterSlider.slider.oninput = audit(() => this.applyMasterValue());
    footer.append(this._masterSlider.htmlElement);
  }

  private prepareHeader(): void {
  }

  private applyMasterValue(): void {
    const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;
    const masterGain = this._audio.master.gain;
    const now = this._audio.context.currentTime;
    const value = parseNumber(masterSlider.value) / 100;
    masterGain.linearRampToValueAtTime(value, now + 0.01);
  }

  private initializeSketchIfReady(): void {
    if (! this._sketchWasInitialized
      && this._currentCode != null
      && this._audioReady) {
      this.build();
    }
  }

  private compileCode(src: string): Function {
    src = `with (sandbox) { ${src} }`;

    const code = new Function('sandbox', src);

    return (sandbox: any) => {
      if (! this._sandboxProxies.has(sandbox)) {
        const sandboxProxy = new Proxy(sandbox, {
          has(): boolean {
            return true;
          },

          get(target: string, key: symbol): any {
            if (key === Symbol.unscopables) return undefined;
            return target[key];
          },
        });

        this._sandboxProxies.set(sandbox, sandboxProxy);
      }

      return code(this._sandboxProxies.get(sandbox));
    }
  }

  private initDevClient(): void {
    this._devClient = new DevClient();

    this._devClient.onFilesAvailable = (files) => {
      this.setFiles(files);
      this._devClient.watchFile(files[0]);
    };

    this._devClient.onFileChange = (file, content) => {
      if (this._watchedFile != file) {
        this.reset();
        this._watchedFile = file;
        this.setDirty(false);
        this._header.setSyncState('out-of-date');
      }

      this.setSketchCode(content);
    };
  }

  private setDirty(isDirty: boolean): void {
    if (isDirty === this._sketchIsDirty) {
      return;
    }

    this._sketchIsDirty = isDirty;
    this._header.setDirty(isDirty);
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

.fwd-runner-auto-build-label {
  font-size: 11px;
  display: flex;
    align-items: center;
}

.fwd-file-select.dirty {
  font-style: italic;
}
`);


export default class FwdWebRunner extends AbstractWebRunner {
}
