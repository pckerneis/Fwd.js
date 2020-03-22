import Split from 'split.js'
import hljs from 'highlightjs';
import { Fwd, putFwd } from '../core/fwd';
import { Time, EventRef } from '../core';
import FwdRunner from './FwdRunner';
import { SliderOptions, FwdHTMLControls, FwdControls } from '../control/FwdControl';
import { FwdScheduler } from '../core/FwdScheduler';
import { FwdAudio } from '../audio/Audio';
import { FwdLogger } from '../core/FwdLogger';

const startButtonId = 'start-button';
const stopButtonId = 'stop-button';
const masterSliderId = 'master-slider';
const consoleId = 'console';
const timeCodeId = 'time-code';

export default class FwdWebRunner implements FwdRunner {
  private _fwd: Fwd;
  private _logger: FwdLogger;
  private _audio: FwdAudio;
  private _controls: FwdControls;
  
  get audio(): FwdAudio { return this._audio; }
  get controls(): FwdControls { return this._controls; }
  get logger(): FwdLogger { return this._logger; }

  entryPoint: Function;

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
    };

    this.prepareLayout();
    this.loadScriptContent();
    this.initializeHighlightJS();
    this.initializeMainControls();
    this.initializeTimeCode();
  }

  //==================================================================

  onSessionStart(): void {
    throw new Error('Method not implemented.');
  }

  onSessionStop(): void {
    throw new Error('Method not implemented.');
  }

  sliderAdded(name: string, options: SliderOptions): void {
    throw new Error('Method not implemented.');
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
      consoleCode.innerHTML += [timeStr, ...messages].join(' ');
      consoleCode.innerHTML += '\n';

      if (autoScroll) {
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
      }    
    }

    return {
      log: (time: Time, ...messages: any[]) => {
        const timeStr = this.formatTime(time * 1000);
        internalLog(timeStr, ...messages);
        console.log(timeStr, ...messages);
      },
      
      err: (time: Time, ...messages: any[]) => {
        const timeStr = this.formatTime(time * 1000);
        internalLog(timeStr, ...messages);
        console.error(timeStr, ...messages);
      }
    };
  }

  private start() {
    (document.getElementById(startButtonId) as HTMLButtonElement).disabled = true;
    (document.getElementById(stopButtonId) as HTMLButtonElement).disabled = false;
    this._fwd.scheduler.clearEvents();
    this.entryPoint();
    this._audio.start();
    this._fwd.start();
    this.applyMasterValue();
    this.initializeTimeCode();
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
    const seconds = Math.floor((t / 1000) % 60);
    const minutes = Math.floor((t / 1000 / 60));
    const ms = Math.floor(t % 1000);
  
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
    // this.audio.start();
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
