import { FwdAudio } from '../../fwd/audio/FwdAudio';
import { FwdEditor } from '../../fwd/editor/FwdEditor';
import { Fwd, FwdUtils } from '../../fwd/Fwd';
import { FwdGui, fwdGui } from '../../fwd/gui/Gui';
import { fwdMidi, FwdMidi } from '../../fwd/midi/FwdMidi';
import { FwdScheduler } from '../../fwd/scheduler/FwdScheduler';
import { clamp, map, parseNumber, random, simplex } from '../../fwd/utils/numbers';
import FwdRunner from '../FwdRunner';

export default class FwdWebImpl implements Fwd {

  public readonly globals: any = {};
  
  public readonly utils: FwdUtils = {
    clamp, map, parseNumber, random, simplex,
  };
  
  private readonly _scheduler: FwdScheduler;

  private readonly _editor: FwdEditor;

  constructor(private _runner: FwdRunner) {
    this._scheduler = new FwdScheduler();

    this._editor = new FwdEditor();
  }

  public get scheduler(): FwdScheduler {
    return this._scheduler;
  }

  public get audio(): FwdAudio {
    return this._runner.audio;
  }

  public get editor(): FwdEditor {
    return this._editor;
  }

  public get gui(): FwdGui {
    return fwdGui;
  }

  public get midi(): FwdMidi {
    return fwdMidi;
  }
}
