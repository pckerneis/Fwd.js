import { FwdAudio } from '../../api/audio/FwdAudio';
import { FwdContext } from '../../api/core/FwdContext';
import { FwdScheduler } from '../../api/core/FwdScheduler';
import { Editor } from '../../api/editor/Editor';
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
