import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { NoteSequencer } from '../NoteSequencer/note-sequencer';

export class NoteSequencerElement implements EditorElement {

  public readonly noteSequencer: NoteSequencer;

  constructor() {
    this.noteSequencer = new NoteSequencer();
  }

  public get htmlElement(): HTMLElement { return this.noteSequencer.container; }
}
