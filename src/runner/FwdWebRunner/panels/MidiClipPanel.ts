import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { NoteSequencerElement } from '../components/NoteSequencerElement';
import { injectStyle } from '../StyleInjector';

class SettingsPanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(SETTINGS_CLASS);
  }
}

const SETTINGS_CLASS = 'fwd-runner-midi-clip-settings';

injectStyle('MidiClipPanel - SettingsPanel', `
.${SETTINGS_CLASS} {
  width: 200px;
  flex-shrink: 0;
  flex-grow: 0;
  border-right: 1px lightgrey solid;
}
`);

export class MidiClipPanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  public readonly clipSettings: SettingsPanel;
  public readonly clipEditor: NoteSequencerElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS);

    this.clipSettings = new SettingsPanel();
    this.htmlElement.append(this.clipSettings.htmlElement);

    this.clipEditor = new NoteSequencerElement();
    this.clipEditor.htmlElement.classList.add(CLIP_EDITOR_CLASS);
    this.htmlElement.append(this.clipEditor.htmlElement);
  }
}

const CONTAINER_CLASS = 'fwd-runner-midi-clip-panel';
const CLIP_EDITOR_CLASS = 'fwd-runner-midi-clip-editor';

injectStyle('MidiClipPanel', `
.${CONTAINER_CLASS} {
  display: flex;
}

.${CLIP_EDITOR_CLASS} {
  flex-grow: 1;
}
`);
