import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { getMidiOutputNames } from '../../../fwd/midi/FwdMidi';
import { defaultTheme } from '../../style.constants';
import { NoteSequencerElement } from '../components/NoteSequencerElement';
import { FlagDirection, Note } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { MidiClipNodeService } from '../services/midi-clip-node.service';
import { MidiFlagState, MidiNoteState } from '../state/project.state';
import { injectStyle } from '../StyleInjector';
import { PropertyPanel } from './PropertyPanel';

// TODO this can lead to duplicate ids...
let latestAdded = 100;

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

  public get service(): MidiClipNodeService {
    return this.midiClipPanel.service;
  }

  private buildNameField(): void {
    this.clipPropertyPanel.addLabel('Name');
    const nameField = this.clipPropertyPanel.addTextInput(this.service.snapshot.label);
    nameField.onchange = () => this.service.setLabel(nameField.value).subscribe();
  }

  private buildDurationField(): void {
    this.clipPropertyPanel.addLabel('Duration');
    const durationField = this.clipPropertyPanel.addNumberInput(this.service.snapshot.duration, 0);
    durationField.onchange = () => this.service.setDuration(durationField.valueAsNumber).subscribe();
  }

  private buildOutputField(): void {
    const outputs = getMidiOutputNames();
    const defaultValue = outputs[0];
    this.clipPropertyPanel.addLabel('Output');
    const outputField = this.clipPropertyPanel.createSelect(outputs, defaultValue, () => {
    });
    this.clipPropertyPanel.htmlElement.append(outputField);
  }

  private buildSignatureField(): void {
    this.clipPropertyPanel.addLabel('Signature');

    const signature = document.createElement('div');
    signature.classList.add('fwd-runner-midi-clip-signature')
    const span = document.createElement('span');
    span.textContent = '/';

    const upperOptions = new Array(99).fill(0).map((_, i) => i + 1).map(n => n.toString());
    const upperField = this.clipPropertyPanel.createSelect(upperOptions,
      this.service.snapshot.timeSignature.upper.toString(),
      (value) => this.service.setSignatureUpper(Number(value)).subscribe());
    upperField.style.width = '40px';

    const lowerOptions = [1, 2, 4, 8, 16, 32].map(n => n.toString());
    const lowerField = this.clipPropertyPanel.createSelect(lowerOptions,
      this.service.snapshot.timeSignature.lower.toString(),
      (value) => this.service.setSignatureLower(Number(value)).subscribe());
    lowerField.style.width = '40px';

    signature.append(upperField);
    signature.append(span);
    signature.append(lowerField);

    this.clipPropertyPanel.htmlElement.append(signature);
  }

  private buildMarkersSection(): void {
    this.clipPropertyPanel.addTitle('Markers');

    const markersContainer = document.createElement('div');
    this.htmlElement.append(markersContainer);

    let flags = this.service.snapshot.flags;
    let numFlags = this.service.snapshot.flags.length;

    this.refreshMarkers(markersContainer, flags);

    // Refresh all markers if size changed
    this.service.flags$.subscribe(
      (newFlags) => {
        if (newFlags.length != numFlags) {
          numFlags = newFlags.length;
          this.refreshMarkers(markersContainer, newFlags);
        }
      });

    const addMarkerButton = document.createElement('div');
    addMarkerButton.textContent = '+ Add marker';
    addMarkerButton.onclick = () => {
      this.service.addFlag({
        id: (latestAdded++).toString(),
        kind: 'none',
        name: 'flag',
        time: 0,
        color: 'grey',
      }).subscribe();
    };
    this.htmlElement.append(addMarkerButton);
  }

  private refreshMarkers(container: HTMLElement, flags: MidiFlagState[]): void {
    container.innerHTML = '';

    flags.forEach((flag) => {
      const markerPanel = new PropertyPanel();
      container.append(markerPanel.htmlElement);

      const titleContainer = document.createElement('div');
      titleContainer.style.gridColumn = '1 / span 2';
      titleContainer.style.userSelect = 'none';
      titleContainer.style.display = 'flex';
      const titleElem = document.createElement('b');
      titleElem.style.flexGrow = '1';
      titleElem.innerText = flag.name;
      const removeButton = document.createElement('div');
      removeButton.innerText = 'x';
      removeButton.style.padding = '0 4px';
      removeButton.onclick = () => this.service.removeFlag(flag.id).subscribe();

      titleContainer.append(titleElem, removeButton);
      markerPanel.htmlElement.append(titleContainer);

      markerPanel.addLabel('Name');
      const nameField = markerPanel.addTextInput(flag.name);
      nameField.onchange = () => this.service.renameFlag(flag.id, nameField.value).subscribe();

      markerPanel.addLabel('Time');
      const timeField = markerPanel.addNumberInput(flag.time, 0);
      timeField.onchange = () => this.service.setFlagTime(flag.id, timeField.valueAsNumber).subscribe();

      markerPanel.addLabel('Action');
      markerPanel.addSelect(['none', 'inlet', 'outlet'], flag.kind,
        (v) => this.service.setFlagKind(flag.id, v).subscribe());

      this.service.flags$.subscribe(
        (flags: MidiFlagState[]) => {
          const newFlatState = flags.find(f => f.id === flag.id);

          if (newFlatState != null) {
            nameField.value = newFlatState.name;
            timeField.valueAsNumber = newFlatState.time;
            titleElem.innerText = newFlatState.name;
          }
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
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: ${defaultTheme.bgSecondary};
}

.fwd-runner-midi-clip-signature {
  display: flex;
}
`);

export class MidiClipPanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  public readonly clipSettings: SettingsPanel;
  public readonly clipEditor: NoteSequencerElement;

  constructor(public readonly service: MidiClipNodeService) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS);

    this.clipSettings = new SettingsPanel(this);
    this.htmlElement.append(this.clipSettings.htmlElement);

    this.clipEditor = new NoteSequencerElement();
    this.clipEditor.htmlElement.classList.add(CLIP_EDITOR_CLASS);
    this.htmlElement.append(this.clipEditor.htmlElement);

    service.duration$.subscribe((duration) => this.clipEditor.noteSequencer.duration = duration);
    service.signature$.subscribe((signature) => {
      this.clipEditor.noteSequencer.signatureLower = signature.lower;
      this.clipEditor.noteSequencer.signatureUpper = signature.upper;
    });
    service.flags$.subscribe((flags) => this.refreshFlags(flags));

    // Only load notes at startup
    this.refreshNotes(service.snapshot.notes);

    this.clipEditor.noteSequencer.addListener({
      notesChanged: (notes: Note[]) => {
        this.service.setNotes(notes.map(n => ({...n}))).subscribe();
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
    this.clipEditor.noteSequencer.notes = notes.map(n => ({...n}));
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
