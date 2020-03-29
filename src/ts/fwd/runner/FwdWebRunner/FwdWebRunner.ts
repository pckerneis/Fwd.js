import { FwdAudio } from "../../audio/Audio";
import { FwdControls, FwdHTMLControls } from '../../control/FwdControl';
import { Time } from "../../core/EventQueue/EventQueue";
import { Fwd, putFwd } from '../../core/Fwd';
import { FwdLogger } from '../../core/FwdLogger';
import audit from '../../utils/audit';
import FwdRunner from '../FwdRunner';
import FwdWebImpl from "./FwdWebImpl";
import { AudioMeter } from './components/AudioMeter';

const containerId = 'container';
const startButtonId = 'start-button';
const stopButtonId = 'stop-button';
const masterSliderId = 'master-slider';

const consoleViewportId = 'console-viewport';
const consoleCodeId = 'console-code';
const clearConsoleId = 'clear-console';
const autoScrollConsoleId = 'auto-scroll-console';

const timeCodeId = 'time-code';
const actionContainerId = 'actions';

export default class FwdWebRunner implements FwdRunner {

  public sketchModule: any;
  public entryPoint: Function;

  private readonly _fwd: Fwd;
  private readonly _logger: FwdLogger;
  private readonly _audio: FwdAudio;
  private readonly _controls: FwdControls;
  private _masterMeter: AudioMeter;
  private _actionButtons: HTMLButtonElement[];

  constructor() {
    this._logger = this.prepareLogger();
    this._controls = new FwdHTMLControls();
    this._audio = new FwdAudio();

    this._fwd = new FwdWebImpl(this);
    this._audio.initializeModule(this._fwd);
    putFwd(this._fwd);

    this._fwd.scheduler.onEnded = () => {
      (document.getElementById(startButtonId) as HTMLButtonElement).disabled = false;
      (document.getElementById(stopButtonId) as HTMLButtonElement).disabled = true;
      this._actionButtons.forEach(button => button.disabled = true);
    };

    this.initializeMainControls();
    this.initializeTimeCode();
    this.prepareMasterMeter();
  }

  private static parseNumber(str: string): number {
    return str == null ? 0 :
      (typeof str === 'number' ? str :
        (typeof str === 'string' ? Number.parseFloat(str) : 0));
  }
  
  private static formatTime(t: Time): string {
    if (t === null) {
      return null;
    }

    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    const ms = Math.floor((t * 1000) % 1000);
  
    return [
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
      ms.toString().padStart(3, '0').substr(0, 3),
    ].join(':');
  }
  
  public get audio(): FwdAudio { return this._audio; }
  public get controls(): FwdControls { return this._controls; }
  public get logger(): FwdLogger { return this._logger; }

  public set actions(actions: string[]) {
    this.resetActionButtons(actions);
  }

  //==================================================================
  
  private prepareLogger(): FwdLogger {
    const consoleViewport = document.getElementById(consoleViewportId);
    const consoleCode = document.getElementById(consoleCodeId);
    const autoScrollInput = document.getElementById(autoScrollConsoleId) as HTMLInputElement;



    if (!consoleCode || !consoleViewport) {
      return { log: console.log, err: console.error };
    }

    const internalLog = (timeStr: string, ...messages: any[]) => {
      if (timeStr != null) {
        messages = [timeStr, ...messages];
      }

      consoleCode.innerHTML += messages.join(' ');
      consoleCode.innerHTML += '\n';
      
      const autoScroll = autoScrollInput.checked;

      if (autoScroll) {
        consoleViewport.scrollTop = consoleViewport.scrollHeight;
      }    
    };

    
    const clearButton = document.getElementById(clearConsoleId);
    clearButton.onclick = () => {
      consoleCode.innerHTML = '';
    };

    return {
      log: (time: Time, ...messages: any[]) => {
        const timeStr = FwdWebRunner.formatTime(time);
        internalLog(timeStr, ...messages);
        
        if (timeStr === null) {
          console.log(...messages);
        } else {
          console.log(timeStr, ...messages);
        }
      },
      
      err: (time: Time, ...messages: any[]) => {
        const timeStr = FwdWebRunner.formatTime(time);
        internalLog(timeStr, ...messages);
        
        if (timeStr === null) {
          console.error(...messages);
        } else {
          console.error(timeStr, ...messages);
        }
      },
    };
  }

   private start(): void {
    (document.getElementById(startButtonId) as HTMLButtonElement).disabled = true;
    (document.getElementById(stopButtonId) as HTMLButtonElement).disabled = false;

    this._fwd.scheduler.clearEvents();
    this._controls.reset();

    this._audio.start();

    this.entryPoint();
    this._fwd.start();

    this.applyMasterValue();
    this.initializeTimeCode();

    this._actionButtons.forEach(button => button.disabled = false);
  }

  private stop(): void {
    if (this._fwd != null) {
      this._fwd.stop();
    }
  }

  private prepareMasterMeter(): void {
    this._masterMeter = new AudioMeter();
    const container = document.querySelector('#master-meter');
    container.append(this._masterMeter.htmlElement);
    
    this._audio.listeners.push({
      audioContextStarted: (ctx: AudioContext) => {
        this._masterMeter.audioSource = this._audio.master.nativeNode;
      }
    });
  }

  private initializeMainControls(): void {
    const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;
    const startButton = document.getElementById(startButtonId) as HTMLButtonElement;
    const stopButton = document.getElementById(stopButtonId) as HTMLButtonElement;
  
    startButton.onclick = () => this.start();
    stopButton.onclick = () => this.stop();

    masterSlider.oninput = audit(() => this.applyMasterValue());
  }

  private applyMasterValue(): void {
    const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;
    const masterGain = this._audio.master.nativeNode.gain;
    const now = this._audio.context.currentTime;
    const value = FwdWebRunner.parseNumber(masterSlider.value) / 100;
    masterGain.cancelAndHoldAtTime(now);
    masterGain.linearRampToValueAtTime(value, now + 0.01);
  }

  private initializeTimeCode(): void {
    const timeCodeElem = document.getElementById(timeCodeId);

    const update = () => {
      const t = this._fwd.scheduler.rtNow();
      timeCodeElem.innerText = FwdWebRunner.formatTime(t);

      if (this._fwd.scheduler.state !== 'stopped') {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }

  private resetActionButtons(actions: string[]): void {
    const container = document.getElementById(actionContainerId);
    container.innerHTML = '';

    this._actionButtons = [];
    
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.innerText = action;
      button.disabled = true;
      button.onclick = () => {
        const when = this._fwd.scheduler.rtNow();
        this._fwd.schedule(when, this.sketchModule[action]);
      };

      container.append(button);
      this._actionButtons.push(button);
    });
  }
}
