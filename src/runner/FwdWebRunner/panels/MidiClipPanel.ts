import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { NoteSequencerElement } from '../components/NoteSequencerElement';
import { MidiClipNode } from '../GraphComponent/canvas-components/GraphNode';
import { FlagDirection } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { MidiFlagState } from '../state/project.state';
import { injectStyle } from '../StyleInjector';
import { PropertyPanel } from './PropertyPanel';

class SettingsPanel implements EditorElement {

  public readonly htmlElement: HTMLElement;

  private readonly propertyPanel: PropertyPanel = new PropertyPanel();

  constructor(public readonly midiClipPanel: MidiClipPanel) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(SETTINGS_CLASS);

    this.htmlElement.append(this.propertyPanel.htmlElement);

    this.propertyPanel.addTitle('Clip');

    this.propertyPanel.addLabel('Name');
    const nameField = this.propertyPanel.addTextInput(midiClipPanel.node.label);
    nameField.onchange = () => this.midiClipPanel.node.label = nameField.value;

    this.propertyPanel.addLabel('Duration');
    const durationField = this.propertyPanel.addNumberInput(midiClipPanel.node.duration, 0);
    durationField.onchange = () => this.midiClipPanel.node.duration = durationField.valueAsNumber;

    this.propertyPanel.addLabel('Signature');

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

    this.propertyPanel.htmlElement.append(signature);

    this.propertyPanel.addTitle('Markers');
    this.buildMarkersSection();
  }

  private createSelect(options: number[], defaultValue: number, changeHandler: (value: number) => void): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.width = '40px';

    options.forEach((value) => {
      const elem = document.createElement('option');
      elem.value = value.toString();
      elem.innerText = value.toString();
      select.append(elem);
    });

    select.value = defaultValue.toString();

    select.oninput = () => {
      changeHandler(options[select.selectedIndex]);
    };

    return select;
  }

  private buildMarkersSection(): void {
    const markersContainer = document.createElement('div');
    this.htmlElement.append(markersContainer);

    let flags = this.midiClipPanel.node.state.flags;
    let numFlags = this.midiClipPanel.node.state.flags.length;

    this.refreshMarkers(markersContainer, flags);

    // Refresh all markers if size changed
    this.midiClipPanel.node.observeFlags(
      (newFlags) => {
        if (newFlags.length != numFlags) {
          numFlags = newFlags.length;
          this.refreshMarkers(markersContainer, newFlags);
        }
      });
  }

  private refreshMarkers(container: HTMLElement, flags: MidiFlagState[]): void {
    container.innerHTML = '';

    flags.forEach((flag, idx) => {
      const markerPanel = new PropertyPanel();
      container.append(markerPanel.htmlElement);
      const titleElem = markerPanel.addTitle(flag.name);

      markerPanel.addLabel('Name');
      const nameField = markerPanel.addTextInput(flag.name);
      nameField.onchange = () => {
        const updatedFlags = [...flags];
        updatedFlags[idx] = {...updatedFlags[idx], name: nameField.value};
        this.midiClipPanel.node.updateFlags(updatedFlags);
      };

      markerPanel.addLabel('Time');
      const timeField = markerPanel.addNumberInput(flag.time, 0);
      timeField.oninput = () => {
        const updatedFlags = [...flags];
        updatedFlags[idx] = {...updatedFlags[idx], time: timeField.valueAsNumber};
        this.midiClipPanel.node.updateFlags(updatedFlags);
      };

      this.midiClipPanel.node.observeFlags(
        (flags: MidiFlagState[]) => {
          const flag = flags[idx];
          nameField.value = flag.name;
          timeField.valueAsNumber = flag.time;
          titleElem.innerText = flag.name;
        });
    });
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

    this.node.observeFlags((flags) => {
      this.refreshFlags(flags);
    });

    this.refreshFlags(this.node.state.flags);
  }

  private refreshFlags(flags: MidiFlagState[]): void {
    this.clipEditor.noteSequencer.setFlags(flags.map(f => ({
      direction: FlagDirection.right,
      label: f.name,
      color: f.color,
      time: f.time,
      selected: false,
    })));
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
