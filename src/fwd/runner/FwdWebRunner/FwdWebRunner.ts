import { FwdAudio } from "../../audio/FwdAudio";
import { FwdAudioImpl } from "../../audio/FwdAudioImpl";
import { FwdAudioTrack } from "../../audio/nodes/FwdAudioTrack";
import { FwdControls } from '../../control/FwdControl';
import { Time } from "../../core/EventQueue/EventQueue";
import { Fwd, putFwd } from '../../core/Fwd';
import { FwdLogger } from '../../core/FwdLogger';
import { parseNumber } from '../../core/utils/numbers';
import { formatTime } from '../../core/utils/time';
import audit from '../../utils/audit';
import FwdRunner from '../FwdRunner';
import { ControlBindingManager } from './components/BindableController';
import { FwdWebConsole } from './components/Console';
import { IconButton } from "./components/IconButton";
import { MasterSlider } from './components/MasterSlider';
import FwdWebImpl from "./FwdWebImpl";
import { injectStyle } from "./StyleInjector";

const masterSliderId = 'master-slider';
const toolbarId = 'fwd-runner-toolbar';
const footerId = 'fwd-runner-footer';
const terminalDrawerId = 'fwd-runner-terminal-drawer';

export default class FwdWebRunner implements FwdRunner {
  public sketchModule: any;
  public entryPoint: Function;

  private readonly _fwd: Fwd;
  private readonly _audio: FwdAudio;

  private _logger: FwdLogger;
  private _oneLineLogger: HTMLSpanElement;
  private _toolbar: HTMLElement;
  private _buildButton: IconButton;
  private _playButton: IconButton;

  constructor() {
    this._audio = new FwdAudioImpl();
    this._fwd = new FwdWebImpl(this);
    this._audio.initializeModule(this._fwd);

    putFwd(this._fwd);

    this.buildEditor();
  }

  public get audio(): FwdAudio { return this._audio; }
  public get controls(): FwdControls { return null; }
  public get logger(): FwdLogger { return this._logger; }

  public startAudioContext(): void {
    this._audio.start();
  }

  public buildEditor(): void {
    this._oneLineLogger = document.createElement('span');
    this._oneLineLogger.classList.add('fwd-runner-one-line-logger');
    this._oneLineLogger.style.display = 'none';

    this.prepareHeader();
    this.prepareFooter();
  }

  //==================================================================

  private prepareConsole(): FwdLogger {
    const webConsole: FwdWebConsole = new FwdWebConsole(this._fwd);
    document.getElementById(terminalDrawerId).append(webConsole.htmlElement);

    return {
      log: (time: Time, ...messages: any[]) => {
        webConsole.print(time, messages);

        if (time === null) {
          this._oneLineLogger.innerText = messages[messages.length - 1];
          console.log(...messages);
        } else {
          const timeStr = formatTime(time);
          this._oneLineLogger.innerText = timeStr + ' ' + messages[messages.length - 1];
          console.log(timeStr, ...messages);
        }
      },

      err: (time: Time, ...messages: any[]) => {
        webConsole.print(time, messages);

        if (time === null) {
          this._oneLineLogger.innerText = messages[messages.length - 1];
          console.error(...messages);
        } else {
          const timeStr = formatTime(time);
          this._oneLineLogger.innerText = timeStr + ' ' + messages[messages.length - 1];
          console.error(timeStr, ...messages);
        }
      },
    };
  }

  private start(): void {
    this._playButton.iconName = 'stop';
    this._playButton.htmlElement.onclick = () => this.stop();

    this._fwd.scheduler.clearEvents();

    ControlBindingManager.getInstance().clearCurrentControllers();

    this._fwd.performanceListeners.forEach((l) => {
      if (typeof l.onPerformanceAboutToStart === 'function') {
        l.onPerformanceAboutToStart()
      }
    });

    this._audio.start();
    this.entryPoint();
    this._fwd.scheduler.start();

    this.applyMasterValue();
  }

  private stop(): void {
    if (this._fwd != null) {
      this._fwd.scheduler.stop();

      this._fwd.performanceListeners.forEach((l) => {
        if (typeof l.onPerformanceEnd === 'function') {
          l.onPerformanceEnd();
        }
      });
    }
  }

  private prepareFooter(): void {
    this._logger = this.prepareConsole();

    const footer = document.getElementById(footerId);
    const terminalDrawer = document.getElementById(terminalDrawerId);

    const terminalButton = new IconButton('terminal');
    footer.append(terminalButton.htmlElement);
    footer.append(this._oneLineLogger);

    terminalButton.htmlElement.onclick = () => {
      if (terminalDrawer.style.display === 'none') {
        terminalDrawer.style.display = 'flex';
        this._oneLineLogger.style.display = 'none';
      } else {
        terminalDrawer.style.display = 'none';
        this._oneLineLogger.style.display = 'flex';
      }
    };

    const masterSlider = new MasterSlider();
    masterSlider.slider.oninput = audit(() => this.applyMasterValue());
    footer.append(masterSlider.htmlElement);

    this._audio.listeners.push({
      audioContextStarted: (/*ctx: AudioContext*/) => {
        masterSlider.meter.audioSource = this._audio.master.nativeNode;
      },
      audioTrackAdded: (track: FwdAudioTrack) => {
        // this._mixerSection.addTrack(track);
      },
      audioTrackRemoved: (track: FwdAudioTrack) => {
        // this._mixerSection.removeTrack(track);
      },
    });
  }

  private prepareHeader(): void {
    this._toolbar = document.getElementById(toolbarId);

    this._buildButton = new IconButton('tools');
    this._playButton = new IconButton('play-button');
    this._toolbar.append(
      this._buildButton.htmlElement,
      this._playButton.htmlElement,
    );

    this._playButton.htmlElement.onclick = () => this.start();

    this._fwd.scheduler.onEnded = () => {
      this._playButton.iconName = 'play-button';
      this._playButton.htmlElement.onclick = () => this.start();
    };
  }

  private applyMasterValue(): void {
    const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;
    const masterGain = this._audio.master.nativeNode.gain;
    const now = this._audio.context.currentTime;
    const value = parseNumber(masterSlider.value) / 100;

    // This method may not be implemented...
    if (typeof masterGain.cancelAndHoldAtTime === 'function') {
      masterGain.cancelAndHoldAtTime(now);
    }

    masterGain.linearRampToValueAtTime(value, now + 0.01);
  }
}

injectStyle('FwdWebRunner', `
.fwd-runner-one-line-logger {
  font-family: monospace;
  margin: auto 0 auto 6px;
}
`);
