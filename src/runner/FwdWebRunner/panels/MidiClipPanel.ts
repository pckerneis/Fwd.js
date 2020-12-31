import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { getMidiOutputNames } from '../../../fwd/midi/FwdMidi';
import { NoteSequencerElement } from '../components/NoteSequencerElement';
import { MidiClipNode } from '../GraphComponent/canvas-components/MidiClipNode';
import { FlagDirection, Note } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { MidiFlagState, MidiNoteState } from '../state/project.state';
import { injectStyle } from '../StyleInjector';
import { PropertyPanel } from './PropertyPanel';

class SettingsPanel implements EditorElement {

  public readonly htmlElement: HTMLElement;

  private readonly clipPropertyPanel: PropertyPanel = new PropertyPanel();

  constructor(public readonly midiClipPanel: MidiClipPanel) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(SETTINGS_CLASS);
    this.htmlElement.append(this.clipPropertyPanel.htmlElement);

    this.clipPropertyPanel.addTitle('Clip');
    this.buildNameField();
    this.buildDurationField();
    this.buildSignatureField();
    this.buildOutputField();
    this.buildMarkersSection();
  }

  public get node(): MidiClipNode {
    return this.midiClipPanel.node;
  }

  private buildNameField(): void {
    this.clipPropertyPanel.addLabel('Name');
    const nameField = this.clipPropertyPanel.addTextInput(this.node.label);
    nameField.onchange = () => this.node.label = nameField.value;
  }

  private buildDurationField(): void {
    this.clipPropertyPanel.addLabel('Duration');
    const durationField = this.clipPropertyPanel.addNumberInput(this.node.duration, 0);
    durationField.onchange = () => this.node.duration = durationField.valueAsNumber;
  }

  private buildOutputField(): void {
    const outputs = getMidiOutputNames();
    const defaultValue = outputs[0];
    this.clipPropertyPanel.addLabel('Output');
    const outputField = this.createSelect(outputs, defaultValue, () => {
    });
    this.clipPropertyPanel.htmlElement.append(outputField);
    outputField.style.width = '100%';
  }

  private buildSignatureField(): void {
    this.clipPropertyPanel.addLabel('Signature');

    const signature = document.createElement('div');
    signature.classList.add('fwd-runner-midi-clip-signature')
    const span = document.createElement('span');
    span.textContent = '/';

    const upperOptions = new Array(99).fill(0).map((_, i) => i + 1).map(n => n.toString());
    const upperField = this.createSelect(upperOptions, this.node.signature.upper.toString(),
      (value) => this.node.setSignatureUpper(Number(value)));

    const lowerOptions = [1, 2, 4, 8, 16, 32].map(n => n.toString());
    const lowerField = this.createSelect(lowerOptions, this.node.signature.lower.toString(),
      (value) => this.node.setSignatureLower(Number(value)));

    signature.append(upperField);
    signature.append(span);
    signature.append(lowerField);

    this.clipPropertyPanel.htmlElement.append(signature);
  }

  private buildMarkersSection(): void {
    this.clipPropertyPanel.addTitle('Markers');

    const markersContainer = document.createElement('div');
    this.htmlElement.append(markersContainer);

    let flags = this.node.state.flags;
    let numFlags = this.node.state.flags.length;

    this.refreshMarkers(markersContainer, flags);

    // Refresh all markers if size changed
    this.node.observeFlags(
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
        const updatedFlags = [...this.node.state.flags];
        updatedFlags[idx] = {...updatedFlags[idx], name: nameField.value};
        this.node.updateFlags(updatedFlags);
      };

      markerPanel.addLabel('Time');
      const timeField = markerPanel.addNumberInput(flag.time, 0);
      timeField.oninput = () => {
        const updatedFlags = [...this.node.state.flags];
        updatedFlags[idx] = {...updatedFlags[idx], time: timeField.valueAsNumber};
        this.node.updateFlags(updatedFlags);
      };

      this.node.observeFlags(
        (flags: MidiFlagState[]) => {
          const flag = flags[idx];
          nameField.value = flag.name;
          timeField.valueAsNumber = flag.time;
          titleElem.innerText = flag.name;
        });
    });
  }

  private createSelect(options: string[], defaultValue: string, changeHandler: (value: string) => void): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.width = '40px';

    options.forEach((value) => {
      const elem = document.createElement('option');
      elem.value = value;
      elem.innerText = value;
      select.append(elem);
    });

    select.value = defaultValue;

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

    this.refreshFlags(this.node.state.flags);
    this.node.observeFlags((flags) => {
      this.refreshFlags(flags);
    });

    this.refreshNotes(this.node.state.notes);
    this.node.observeNotes((notes) => {
      this.refreshNotes(notes);
    });

    this.clipEditor.noteSequencer.addListener({
      notesChanged: (notes: Note[]) => {
        this.node.notes = notes;
      },
    })
  }

  private refreshFlags(flags: MidiFlagState[]): void {
    this.clipEditor.noteSequencer.setFlags(flags.map(f => ({
      direction: f.kind === 'inlet' ? FlagDirection.right : FlagDirection.left,
      label: f.name,
      color: f.color,
      time: f.time,
      selected: false,
    })));
  }

  private refreshNotes(notes: MidiNoteState[]): void {
    this.clipEditor.noteSequencer.notes = notes.map(n => ({
      ...n,
      selected: false,
      tempDuration: undefined,
      hidden: undefined,
      initialStart: undefined,
      initialVelocity: undefined,
    }));
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
