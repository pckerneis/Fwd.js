import Split from 'split.js'
import hljs from 'highlightjs';
import { Fwd, putFwd } from '../core/fwd';
import { Time, EventRef } from '../core';
import FwdRunner from './FwdRunner';
import { FwdHTMLControls, FwdControls } from '../control/FwdControl';
import { FwdScheduler } from '../core/FwdScheduler';
import { FwdAudio } from '../audio/Audio';
import { FwdLogger } from '../core/FwdLogger';

const startButtonId = 'start-button';
const stopButtonId = 'stop-button';
const masterSliderId = 'master-slider';
const consoleId = 'console';
const timeCodeId = 'time-code';
const actionContainerId = 'actions';

export default class FwdWebRunner implements FwdRunner {
  private _fwd: Fwd;
  private _logger: FwdLogger;
  private _audio: FwdAudio;
  private _controls: FwdControls;
  private _actionButtons: HTMLButtonElement[];
  
  get audio(): FwdAudio { return this._audio; }
  get controls(): FwdControls { return this._controls; }
  get logger(): FwdLogger { return this._logger; }

  sketchModule: any;
  entryPoint: Function;
  
  set actions(actions: string[]) {
    this.resetActionButtons(actions);
  }

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

    this.prepareLayout();
    this.loadScriptContent();
    this.initializeHighlightJS();
    this.initializeMainControls();
    this.initializeTimeCode();
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
    }

    return {
      log: (time: Time, ...messages: any[]) => {
        const timeStr = this.formatTime(time);
        internalLog(timeStr, ...messages);
        
        if (timeStr === null) {
          console.log(...messages);
        } else {
          console.log(timeStr, ...messages);
        }
      },
      
      err: (time: Time, ...messages: any[]) => {
        const timeStr = this.formatTime(time);
        internalLog(timeStr, ...messages);
        
        if (timeStr === null) {
          console.error(...messages);
        } else {
          console.error(timeStr, ...messages);
        }
      }
    };
  }

   private start() {
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

  private stop() {
    if (this._fwd != null) {
      this._fwd.stop();
    }
  }

  private initializeMainControls() {
    const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;
    const startButton = document.getElementById(startButtonId) as HTMLButtonElement;
    const stopButton = document.getElementById(stopButtonId) as HTMLButtonElement;
  
    startButton.onclick = () => this.start();
    stopButton.onclick = () => this.stop();

    masterSlider.oninput = () => this.applyMasterValue();
  }

  private applyMasterValue() {
    const masterSlider = document.getElementById(masterSliderId) as HTMLInputElement;

    const v = this.parseNumber(masterSlider.value) / 100;
    this._audio.master.nativeNode.gain.linearRampToValueAtTime(v, 0);
  }
  
  private initializeHighlightJS() {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  }
  
  private loadScriptContent() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'src/ts/sketch.ts', false);
    xhr.send();
  
    if (xhr.status == 200) {
      document.getElementById('sketch-code').innerText = xhr.responseText;
    }
  }
  
  private prepareLayout() {
    Split(['#editor', '#console'], {
        sizes: [70, 30],
        minSize: [0, 0],
        direction: 'vertical',
        gutterSize: 6,
        snapOffset: 80
      }
    );
  }

  private parseNumber(number: string) {
    return number == null ? 0 : 
      (typeof number === 'number' ? number :
        (typeof number === 'string' ? Number.parseFloat(number) : 0));
  }
  
  private formatTime(t: Time) {
    if (t === null) {
      return null;
    }

    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    const ms = Math.floor((t * 1000) % 1000);
  
    return [
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
      ms.toString().padStart(3, '0').substr(0, 3)
    ].join(':');
  }

  private initializeTimeCode() {
    const timeCodeElem = document.getElementById(timeCodeId);

    const update = () => {
      const t = this._fwd.scheduler.rtNow();
      timeCodeElem.innerText = this.formatTime(t);

      if (this._fwd.scheduler.state !== 'stopped') {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }

  private resetActionButtons(actions: string[]) {
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
      }

      container.append(button);
      this._actionButtons.push(button);
    });
  }
}

class FwdWebImpl implements Fwd {
  private _scheduler: FwdScheduler;

  public get scheduler(): FwdScheduler {
    return this._scheduler;
  }

  public get logger(): FwdLogger {
    return this._runner.logger;
  }

  public get audio(): FwdAudio {
    return this._runner.audio;
  }

  public get controls(): FwdControls {
    return this._runner.controls;
  }

  constructor(private _runner: FwdWebRunner) {
    this._scheduler = new FwdScheduler();
    this.audio.initializeModule(this);
  }
  
  now(): Time {
    return this._scheduler.now();
  }

  schedule(t: number, fn: Function, preventCancel?: boolean): EventRef {
    return this._scheduler.schedule(t, fn, preventCancel);
  };

  cancel(ref: EventRef): void {
    this._scheduler.cancel(ref);
  }

  start(): void {
    this._scheduler.start();
  }

  stop(): void {
    this._scheduler.stop();
  }

  log(...messages: any[]): void {
    this.logger.log(this._scheduler.now(), ...messages);
  }

  err(...messages: any[]): void {
    this.logger.err(this._scheduler.now(), ...messages);
  }

  wait(t: Time): void {
    this._scheduler.wait(t);
  }

  random(a?: number, b?: number): number {
    if (a == null && b == null) {
      return Math.random();
    }
  
    if (b == null) {
      return a * Math.random();
    }
  
    return a + (b * Math.random());
  }
}
