import { FwdAudio } from "../../audio/FwdAudio";
import { FwdContext } from '../../core/FwdContext';
import { FwdScheduler } from '../../core/FwdScheduler';
import { Editor } from "../../editor/Editor";
import FwdRunner from '../FwdRunner';

export default class FwdWebImpl implements FwdContext {

  public readonly globals: any = {};

  private readonly _scheduler: FwdScheduler;

  private readonly _editor: Editor;

  constructor(private _runner: FwdRunner) {
    this._scheduler = new FwdScheduler();

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

}
