import hljs from 'highlightjs';
import Split from 'split.js'
import { FwdAudio } from "../../audio/Audio";
import { FwdControls, FwdHTMLControls } from '../../control/FwdControl';
import { Time } from "../../core/EventQueue/EventQueue";
import { Fwd, putFwd } from '../../core/Fwd';
import { FwdLogger } from '../../core/FwdLogger';
import audit from '../../utils/audit';
import FwdRunner from '../FwdRunner';
import FwdWebImpl from "./FwdWebImpl";

const startButtonId = 'start-button';
const stopButtonId = 'stop-button';
const masterSliderId = 'master-slider';
const consoleId = 'console';
const timeCodeId = 'time-code';
const actionContainerId = 'actions';

export default class FwdWebRunner implements FwdRunner {

  public sketchModule: any;
  public entryPoint: Function;

  private readonly _fwd: Fwd;
  private readonly _logger: FwdLogger;
  private readonly _audio: FwdAudio;
  private readonly _controls: FwdControls;
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

    FwdWebRunner.prepareLayout();
    FwdWebRunner.loadScriptContent();
    this.initializeHighlightJS();
    this.initializeMainControls();
    this.initializeTimeCode();
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
  
  private static loadScriptContent(): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'src/ts/sketch.ts', false);
    xhr.send();
  
    if (xhr.status == 200) {
      document.getElementById('sketch-code').innerText = xhr.responseText;
    }
  }
  
  private static prepareLayout(): void {
    Split(['#editor', '#console'], {
        sizes: [70, 30],
        minSize: [0, 0],
        direction: 'vertical',
        gutterSize: 6,
        snapOffset: 80,
      },
    );
  }
  
  public get audio(): FwdAudio { return this._audio; }
  public get controls(): FwdControls { return this._controls; }
  public get logger(): FwdLogger { return this._logger; }

  public set actions(actions: string[]) {
    this.resetActionButtons(actions);
  }

  //==================================================================
  
  private prepareLogger(): FwdLogger {
    const consoleDiv = document.getElementById(consoleId);
    const consoleCode = consoleDiv.children[0];
    const autoScroll = true;

    if (!consoleCode || !consoleDiv) {
      return { log: console.log, err: console.error };
    }

    const internalLog = (timeStr: string, ...messages: any[]) => {
      if (timeStr != null) {
        messages = [timeStr, ...messages];
      }

      consoleCode.innerHTML += messages.join(' ');
      consoleCode.innerHTML += '\n';

      if (autoScroll) {
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
      }    
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

    this.entryPoint();

    this._audio.start();
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
    const v = FwdWebRunner.parseNumber(masterSlider.value) / 100;
    masterGain.cancelAndHoldAtTime(now);
    masterGain.linearRampToValueAtTime(v, now + 0.01);
  }
  
  private initializeHighlightJS(): void {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
    });
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
        const when = (this._fwd.scheduler.now() + 50) / 1000;
        this._fwd.schedule(when, this.sketchModule[action]);
      };

      container.append(button);
      this._actionButtons.push(button);
    });
  }
}
