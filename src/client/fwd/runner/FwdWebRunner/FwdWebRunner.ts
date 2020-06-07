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
import { TimeDisplay } from './components/TimeDisplay';
import FwdWebImpl from './FwdWebImpl';
import { injectStyle } from './StyleInjector';

const masterSliderId = 'master-slider';
const toolbarId = 'fwd-runner-toolbar';
const footerId = 'fwd-runner-footer';
const terminalDrawerId = 'fwd-runner-terminal-drawer';

class AbstractWebRunner implements FwdRunner {

  public onSketchFileChange: (file: string) => void = null;

  private readonly _fwd: Fwd;
  private readonly _audio: FwdAudio;

  private readonly _terminalDrawer: HTMLElement;
  private _oneLineLogger: HTMLLabelElement;
  private _toolbar: HTMLElement;
  private _buildButton: IconButton;
  private _playButton: IconButton;
  private _projectSelect: HTMLSelectElement;

  private _audioReady: boolean;
  private _sketchCode: string;
  private _sketchWasInitialized: boolean;

  private _running: boolean;
  private _autoBuildInput: HTMLInputElement;
  private _autoBuilds: boolean;
  private _masterSlider: MasterSlider;
  private codeEditor: RunnerCodeEditor;
  private _timeDisplay: TimeDisplay;

  constructor() {
    this._terminalDrawer = document.getElementById(terminalDrawerId);
    this._terminalDrawer.style.display = 'none';

    this._audio = new FwdAudioImpl();

    this._fwd = new FwdWebImpl(this);

    this._fwd.scheduler.onEnded = () => {
      this._playButton.iconName = 'play-button';
      this._playButton.htmlElement.onclick = () => this.start();
      this._running = false;
    };

    this._audio.initializeModule(this._fwd);

    putFwd(this._fwd);

    this.buildEditor();
  }

  public get audio(): FwdAudio {
    return this._audio;
  }

  public setSketchCode(newSketch: string): void {
    this._sketchCode = newSketch;
    this.codeEditor.code = newSketch;

    if (this._sketchWasInitialized && this._autoBuilds) {
      this.build();
    } else {
      this.initializeSketchIfReady();
    }
  }

  public setFiles(files: string[]): void {
    files
      .map(label => {
        const option = document.createElement('option');
        option.value = label;
        option.innerText = label;
        return option;
      }).forEach(option => {
      this._projectSelect.append(option);
    });
  }

  public startAudioContext(): void {
    this._audio.start();
    this._audioReady = true;
    this.initializeSketchIfReady();
    this._masterSlider.meter.audioSource = this._audio.master;
  }

  public buildEditor(): void {
    this.prepareHeader();
    this.prepareFooter();

    const flexPanel = new FlexPanel();
    this.codeEditor = new RunnerCodeEditor();

    this.codeEditor.codeMirror.on('changes', debounce(() => {
      if (this._autoBuilds) {
        this.build();
      }
    }, 200));

    flexPanel.addFlexItem('left', this.codeEditor, {
      minWidth: 100,
      maxWidth: 5000,
      width: 600,
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

  public reset(): void {
    if (this._running) {
      this.stop();
    }

    this._fwd.onInit = null;
    this._fwd.onStart = null;
    this._fwd.onStop = null;
    this._fwd.editor.reset();
    this._sketchCode = null;
    this._sketchWasInitialized = false;
    this._fwd.globals = {};
    this._fwd.scheduler.resetActions();
  }

  //==================================================================

  private prepareConsole(): void {
    const webConsole: FwdWebConsole = new FwdWebConsole(this._fwd);
    document.getElementById(terminalDrawerId).append(webConsole.htmlElement);

    const nativeLog = console.log;
    const nativeErr = console.error;

    const log = (...messages: any[]) => {
      const time = this._running ? this._fwd.now() : null;

      webConsole.print(time, messages);

      if (time === null) {
        this._oneLineLogger.innerText = messages[messages.length - 1];
        nativeLog(...messages);
      } else {
        const timeStr = formatTime(time);
        this._oneLineLogger.innerText = timeStr + ' ' + messages[messages.length - 1];
        nativeLog(timeStr, ...messages);
      }
    };

    const err = (...messages: any[]) => {
      const time = this._running ? this._fwd.now() : null;

      webConsole.print(time, messages);

      if (time === null) {
        this._oneLineLogger.innerText = messages[messages.length - 1];
        nativeErr(...messages);
      } else {
        const timeStr = formatTime(time);
        this._oneLineLogger.innerText = timeStr + ' ' + messages[messages.length - 1];
        nativeErr(timeStr, ...messages);
      }
    };

    console.log = log;
    console.error = err;
  }

  private start(): void {
    if (! this._sketchWasInitialized) {
      throw new Error('The sketch was not initialized');
    }

    if (typeof fwd.onStart !== 'function') {
      console.error(null, `Nothing to start.`);
      return;
    }

    this._playButton.iconName = 'stop';
    this._playButton.htmlElement.onclick = () => this.stop();

    this._fwd.scheduler.clearEvents();

    ControlBindingManager.getInstance().clearCurrentControllers();

    this._running = true;

    this._audio.start();
    fwd.onStart();
    this._fwd.scheduler.start();

    this.applyMasterValue();

    this._timeDisplay.animate();
  }

  private build(): void {
    if (this._sketchCode == null) {
      throw new Error('The sketch could not be executed');
    }

    try {
      compileCode(this.codeEditor.code)(window);
    } catch (e) {
      console.error(e);
    }

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
  }

  private stop(): void {
    if (this._fwd != null) {
      this._fwd.scheduler.stop();
    }
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
    this._toolbar = document.getElementById(toolbarId);

    this._projectSelect = document.createElement('select');
    this._projectSelect.classList.add('fwd-file-select');
    this._projectSelect.oninput = () => {
      if (typeof this.onSketchFileChange === 'function') {
        this.onSketchFileChange(this._projectSelect.value);
      }
    };

    const spacer = () => {
      const elem = document.createElement('span');
      elem.style.flexGrow = '1';
      return elem;
    };

    this._autoBuildInput = document.createElement('input');
    this._autoBuildInput.type = 'checkbox';

    const autoBuildLabel = document.createElement('label');
    autoBuildLabel.classList.add('fwd-runner-auto-build-label');
    autoBuildLabel.innerText = 'Auto-build';
    autoBuildLabel.append(this._autoBuildInput);

    this._buildButton = new IconButton('tools');
    this._playButton = new IconButton('play-button');

    this._timeDisplay = new TimeDisplay(this._fwd.scheduler);

    this._toolbar.append(
      this._projectSelect,
      spacer(),
      autoBuildLabel,
      this._buildButton.htmlElement,
      this._playButton.htmlElement,
      this._timeDisplay.htmlElement,
      // spacer(),
    );

    this._autoBuildInput.oninput = () => this.handleAutoBuildInputChange();
    this._buildButton.htmlElement.onclick = () => this.build();
    this._playButton.htmlElement.onclick = () => this.start();
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
      && this._sketchCode != null
      && this._audioReady) {
      this.build();
    }
  }

  private handleAutoBuildInputChange(/*event: Event*/): void {
    this._autoBuilds = this._autoBuildInput.checked;
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
`);


export default class FwdWebRunner extends AbstractWebRunner {
}

const sandboxProxies = new WeakMap();

function compileCode(src: string): Function {
  src = 'with (sandbox) {' + src + '}';
  const code = new Function('sandbox', src);

  return function (sandbox: any): any {
    if (! sandboxProxies.has(sandbox)) {
      const sandboxProxy = new Proxy(sandbox, {
        has(): boolean {
          return true;
        },

        get(target: string, key: symbol): any {
          if (key === Symbol.unscopables) return undefined;
          return target[key];
        },
      });

      sandboxProxies.set(sandbox, sandboxProxy);
    }

    return code(sandboxProxies.get(sandbox));
  }
}