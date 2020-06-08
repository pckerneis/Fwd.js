import { FwdAudio } from "../../audio/FwdAudio";
import { EventRef, Time } from '../../core/EventQueue/EventQueue';
import { Fwd } from '../../core/fwd';
import { FwdScheduler } from '../../core/FwdScheduler';
import { Editor } from "../../editor/Editor";
import FwdRunner from '../FwdRunner';

export default class FwdWebImpl implements Fwd {

  public readonly globals: any = {};

  private readonly _scheduler: FwdScheduler;

  private readonly _editor: Editor;

  constructor(private _runner: FwdRunner) {
    this._scheduler = new FwdScheduler();
    this.audio.initializeModule(this);

    this._editor = new Editor();
  }

  public get scheduler(): FwdScheduler {
    return this._scheduler;
  }

  public get audio(): FwdAudio {
    return this._runner.audio;
  }

  public get editor(): Editor {
    return this._editor;
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
