import { FwdAudio } from '../../audio/Audio';
import { FwdControls } from '../../control/FwdControl';
import { EventRef, Time } from '../../core/EventQueue/EventQueue';
import { Fwd } from '../../core/Fwd';
import { FwdLogger } from '../../core/FwdLogger';
import { FwdScheduler } from '../../core/FwdScheduler';
import FwdWebRunner from './FwdWebRunner';

export default class FwdWebImpl implements Fwd {

  private readonly _scheduler: FwdScheduler;

  constructor(private _runner: FwdWebRunner) {
    this._scheduler = new FwdScheduler();
    this.audio.initializeModule(this);
  }

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
  
  public now(): Time {
    return this._scheduler.now();
  }

  public schedule(t: number, fn: Function, preventCancel?: boolean): EventRef {
    return this._scheduler.schedule(t, fn, preventCancel);
  }
  public cancel(ref: EventRef): void {
    this._scheduler.cancel(ref);
  }

  public start(): void {
    this._scheduler.start();
  }

  public stop(): void {
    this._scheduler.stop();
  }

  public log(...messages: any[]): void {
    this.logger.log(this._scheduler.now(), ...messages);
  }

  public err(...messages: any[]): void {
    this.logger.err(this._scheduler.now(), ...messages);
  }

  public wait(t: Time): void {
    this._scheduler.wait(t);
  }

  public random(a?: number, b?: number): number {
    if (a == null && b == null) {
      return Math.random();
    }
  
    if (b == null) {
      return a * Math.random();
    }
  
    return a + ((b - a) * Math.random());
  }
}