import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { NoteSequencerElement } from '../components/NoteSequencerElement';
import { MidiClipNode } from '../GraphComponent/canvas-components/GraphNode';
import { injectStyle } from '../StyleInjector';
import { PropertyPanel } from './PropertyPanel';

class SettingsPanel extends PropertyPanel {

  constructor(public readonly midiClipPanel: MidiClipPanel) {
    super();
    this.htmlElement.classList.add(SETTINGS_CLASS);

    this.addTitle('Clip');

    this.addLabel('Name');
    const nameField = this.addTextInput(midiClipPanel.node.label);
    nameField.onchange = () => this.midiClipPanel.node.label = nameField.value;

    this.addLabel('Duration');
    const durationField = this.addNumberInput(midiClipPanel.node.duration, 0);
    durationField.onchange = () => this.midiClipPanel.node.duration = durationField.valueAsNumber;

    this.addLabel('Signature');

    const signature = document.createElement('div');
    signature.classList.add('fwd-runner-midi-clip-signature')
    const span = document.createElement('span');
    span.textContent = '/';

    const upperOptions = new Array(99).fill(0).map((_, i) => i + 1);
    const upperField = this.createSelect(upperOptions, midiClipPanel.node.signature.upper,
      (value) => this.midiClipPanel.node.setSignatureUpper(value));

    const lowerOptions = [1, 2, 4, 8, 16, 32];
    const lowerField = this.createSelect(lowerOptions, midiClipPanel.node.signature.lower,
      (value) => this.midiClipPanel.node.setSignatureLower(value));

    signature.append(upperField);
    signature.append(span);
    signature.append(lowerField);

    this.htmlElement.append(signature);
  }

  private createSelect(options: number[], defaultValue: number, changeHandler: (value: number) => void): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.width = '40px';

    options.forEach((value) => {
      const elem = document.createElement('option');
      elem.value = value.toString();
      elem.innerText = value.toString();
      select.append(elem);
    })

    select.value = defaultValue.toString();

    select.oninput = () => {
      changeHandler(options[select.selectedIndex]);
    };

    return select;
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

.fwd-runner-midi-clip-signature {
  display: flex;
}
`);

export class MidiClipPanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  public readonly clipSettings: SettingsPanel;
  public readonly clipEditor: NoteSequencerElement;

  constructor(public readonly node: MidiClipNode) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS);

    this.clipSettings = new SettingsPanel(this);
    this.htmlElement.append(this.clipSettings.htmlElement);

    this.clipEditor = new NoteSequencerElement();
    this.clipEditor.htmlElement.classList.add(CLIP_EDITOR_CLASS);
    this.htmlElement.append(this.clipEditor.htmlElement);

    this.node.observeDuration((newDuration) => this.clipEditor.noteSequencer.duration = newDuration);
    this.clipEditor.noteSequencer.duration = this.node.duration;

    this.node.observeSignatureUpper((newSignUpper) => this.clipEditor.noteSequencer.signatureUpper = newSignUpper);
    this.clipEditor.noteSequencer.signatureUpper = this.node.signature.upper;

    this.node.observeSignatureLower((newSignLower) => this.clipEditor.noteSequencer.signatureLower = newSignLower);
    this.clipEditor.noteSequencer.signatureLower = this.node.signature.lower;
  }
}

const CONTAINER_CLASS = 'fwd-runner-midi-clip-panel';
const CLIP_EDITOR_CLASS = 'fwd-runner-midi-clip-editor';

injectStyle('MidiClipPanel', `
.${CONTAINER_CLASS} {
  display: flex;
  overflow: hidden;
}

.${CLIP_EDITOR_CLASS} {
  flex-grow: 1;
  flex-shrink: 1;
  overflow: hidden;
}
`);
