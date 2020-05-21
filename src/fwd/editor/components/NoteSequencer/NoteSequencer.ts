import { NoteSequencer } from "note-sequencer";
import { EditorElement } from "../../api/Editor";

customElements.define('note-sequencer', NoteSequencer);

export class NoteSequencerElement implements EditorElement {
  public readonly noteSequencer: NoteSequencer;
  public readonly htmlElement: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.innerHTML = '<note-sequencer></note-sequencer>';
    this.noteSequencer = this.htmlElement.children.item(0) as NoteSequencer;
  }
}
