import { FwdAudio } from "../../audio/Audio";
import { FwdControls } from '../../control/FwdControl';
import { FwdHTMLControls } from '../../control/FwdHtmlControl';
import { Time } from "../../core/EventQueue/EventQueue";
import { Fwd, putFwd } from '../../core/Fwd';
import { FwdLogger } from '../../core/FwdLogger';
import audit from '../../utils/audit';
import FwdRunner from '../FwdRunner';
import FwdWebImpl from "./FwdWebImpl";
import { AudioMeter } from './components/AudioMeter';
import { formatTime } from '../../core/utils/time';
import { parseNumber } from '../../core/utils/numbers';
import { FwdWebConsole } from './components/Console';
import { BindableButton } from './components/BindableButton';

const containerId = 'container';
const startButtonId = 'start-button';
const stopButtonId = 'stop-button';
const masterSliderId = 'master-slider';
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
  private _actionButtons: BindableButton[];

  constructor() {
    this._controls = new FwdHTMLControls();
    document.getElementById(containerId).append(this._controls.htmlElement);
    this._logger = this.prepareLogger();
    this._audio = new FwdAudio();

    this._fwd = new FwdWebImpl(this);
    this._audio.initializeModule(this._fwd);
    putFwd(this._fwd);

    this._fwd.scheduler.onEnded = () => {
      (document.getElementById(startButtonId) as HTMLButtonElement).disabled = false;
      (document.getElementById(stopButtonId) as HTMLButtonElement).disabled = true;
      this._actionButtons.forEach(button => button.active = false);
    };

    this.initializeMainControls();
    this.initializeTimeCode();
    this.prepareMasterMeter();
  }
  
  public get audio(): FwdAudio { return this._audio; }
  public get controls(): FwdControls { return this._controls; }
  public get logger(): FwdLogger { return this._logger; }

  public set actions(actions: string[]) {
    this.resetActionButtons(actions);
  }

  //==================================================================
  
  private prepareLogger(): FwdLogger {
    const webConsole: FwdWebConsole = new FwdWebConsole();
    document.getElementById(containerId).append(webConsole.htmlElement);

    return {
      log: (time: Time, ...messages: any[]) => {
        webConsole.print(time, messages);
        
        if (time === null) {
          console.log(...messages);
        } else {
          const timeStr = formatTime(time);
          console.log(timeStr, ...messages);
        }
      },
      
      err: (time: Time, ...messages: any[]) => {
        webConsole.print(time, messages);
        
        if (time === null) {
          console.error(...messages);
        } else {
          const timeStr = formatTime(time);
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

    this._actionButtons.forEach(button => button.active = true);
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
    const value = parseNumber(masterSlider.value) / 100;
    masterGain.cancelAndHoldAtTime(now);
    masterGain.linearRampToValueAtTime(value, now + 0.01);
  }

  private initializeTimeCode(): void {
    const timeCodeElem = document.getElementById(timeCodeId);

    const update = () => {
      const t = this._fwd.scheduler.rtNow();
      timeCodeElem.innerText = formatTime(t);

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
      const button = new BindableButton(action);
      button.active = false;
      button.action = () => {
        const when = this._fwd.scheduler.rtNow();
        this._fwd.schedule(when, this.sketchModule[action]);
      };

      container.append(button.htmlElement);
      this._actionButtons.push(button);
    });
  }
}
