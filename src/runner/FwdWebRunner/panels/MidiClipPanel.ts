import { map, pluck, switchMap } from 'rxjs/operators';
import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { getMidiOutputNames } from '../../../fwd/midi/FwdMidi';
import { defaultTheme } from '../../style.constants';
import { commandManager } from '../commands/command-manager';
import {
  setMidiClipDuration,
  setMidiClipNotes,
  setMidiClipSignature,
  setNodeLabel,
} from '../commands/graph-sequencer.commands';
import { NoteSequencerElement } from '../components/NoteSequencerElement';
import { FlagDirection } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { GraphSequencerService } from '../services/graph-sequencer.service';
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

  public get service(): GraphSequencerService {
    return this.midiClipPanel.service;
  }

  public get clipId(): number {
    return this.midiClipPanel.clipId;
  }

  private buildNameField(): void {
    this.clipPropertyPanel.addLabel('Name');
    const nameField = this.clipPropertyPanel.addTextInput('');
    this.service.observeNode(this.clipId).pipe(
      pluck('label'))
      .subscribe((newLabel: string) => nameField.value = newLabel);

    nameField.onchange = () => commandManager.perform(setNodeLabel({
      id: this.clipId, name: nameField.value,
    }));
  }

  private buildDurationField(): void {
    this.clipPropertyPanel.addLabel('Duration');
    const durationField = this.clipPropertyPanel.addNumberInput(0, 0);
    this.service.observeMidiClipNode(this.clipId).pipe(
      pluck('duration'))
      .subscribe((newDuration: number) => durationField.value = newDuration.toString(10));

    durationField.onchange = () => commandManager.perform(setMidiClipDuration({
      id: this.clipId, value: durationField.valueAsNumber,
    }));
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

    let selectedUpper = 4,
      selectedLower = 4;

    const signatureChanged = () => {
      commandManager.perform(setMidiClipSignature({
        id: this.clipId,
        value: {
          upper: selectedUpper,
          lower: selectedLower,
        },
      }));
    };

    const upperOptions = new Array(99).fill(0).map((_, i) => i + 1).map(n => n.toString());
    const upperField = this.clipPropertyPanel.createSelect(upperOptions, '4',
      (value) => {
        selectedUpper = parseInt(value);
        signatureChanged();
      });
    upperField.style.width = '40px';

    const lowerOptions = [1, 2, 4, 8, 16, 32].map(n => n.toString());
    const lowerField = this.clipPropertyPanel.createSelect(lowerOptions, '4',
      (value) => {
        selectedLower = parseInt(value);
        signatureChanged();
      });
    lowerField.style.width = '40px';

    signature.append(upperField);
    signature.append(span);
    signature.append(lowerField);

    this.clipPropertyPanel.htmlElement.append(signature);

    this.service.observeMidiClipNode(this.clipId).pipe(
      pluck('timeSignature'),
    ).subscribe((timeSignature) => {
      upperField.value = timeSignature.upper.toString();
      lowerField.value = timeSignature.lower.toString();
    });
  }

  private buildMarkersSection(): void {
    this.clipPropertyPanel.addTitle('Markers');

    const markersContainer = document.createElement('div');
    this.htmlElement.append(markersContainer);

    let numFlags = 0;

    this.service.observeMidiClipNode(this.clipId).pipe(
      pluck('flags'),
    ).subscribe(
      (newFlags) => {
        if (newFlags.length != numFlags) {
          numFlags = newFlags.length;
          this.refreshMarkers(markersContainer, newFlags);
        }
      });

    const addMarkerButton = document.createElement('div');
    addMarkerButton.textContent = '+ Add marker';
    addMarkerButton.classList.add('fwd-add-marker-button');
    addMarkerButton.onclick = () => {
      this.service.createAndAddMidiClipFlag(this.clipId, {
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
      removeButton.innerText = '✕';
      removeButton.classList.add('fwd-remove-flag-button');
      removeButton.onclick = () => this.service.removeMidiClipFlag(this.clipId, flag.id)
        .subscribe();

      titleContainer.append(titleElem, removeButton);
      markerPanel.htmlElement.append(titleContainer);

      markerPanel.addLabel('Name');
      const nameField = markerPanel.addTextInput(flag.name);
      nameField.onchange = () => this.service.renameMidiClipFlag(this.clipId, flag.id, nameField.value)
        .subscribe();

      markerPanel.addLabel('Time');
      const timeField = markerPanel.addNumberInput(flag.time, 0);
      timeField.onchange = () => this.service.setMidiClipFlagTime(this.clipId, flag.id, timeField.valueAsNumber)
        .subscribe();

      markerPanel.addLabel('Action');
      markerPanel.addSelect(['none', 'inlet', 'outlet', 'jump'], flag.kind,
        (v) => this.service.setMidiClipFlagKind(this.clipId, flag.id, v).subscribe());

      const jumpLabel = markerPanel.addLabel('Destination');
      let jumpSelect = markerPanel.addSelect([''], '',
        (v) => this.service.setMidiClipFlagJumpDestination(this.clipId, flag.id, Number(v))
          .subscribe());

      this.service.observeMidiClipNode(this.clipId).pipe(
        pluck('flags'),
        map(flags => flags.find(f => f.id === flag.id)),
      ).subscribe((midiFlagState) => {
        nameField.value = midiFlagState.name;
        timeField.valueAsNumber = midiFlagState.time;
        titleElem.innerText = midiFlagState.name;

        // TODO: re-add options instead of recreating element
        const newJumpSelect = markerPanel.createSelect(flags.map(f => f.id.toString()),
          midiFlagState.jumpDestination?.toString(),
          (v) => this.service.setMidiClipFlagJumpDestination(this.clipId, flag.id, Number(v))
            .subscribe());
        jumpSelect.replaceWith(newJumpSelect);
        jumpSelect = newJumpSelect;

        jumpLabel.style.display = midiFlagState.kind === 'jump' ? 'inline' : 'none';
        jumpSelect.style.display = midiFlagState.kind === 'jump' ? 'inline' : 'none';
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

.fwd-remove-flag-button {
  padding: 0 4px;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.6;
}

.fwd-remove-flag-button:hover {
  opacity: 1;
}

.fwd-add-marker-button {
  align-self: center;
  padding: 4px;
  font-size: smaller;
  opacity: 0.6;
  cursor: pointer;
}

.fwd-add-marker-button:hover {
  opacity: 1;
}
`);

export class MidiClipPanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  public readonly clipSettings: SettingsPanel;
  public readonly clipEditor: NoteSequencerElement;

  constructor(public readonly service: GraphSequencerService,
              public readonly clipId: number) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(CONTAINER_CLASS);

    this.clipSettings = new SettingsPanel(this);
    this.htmlElement.append(this.clipSettings.htmlElement);

    this.clipEditor = new NoteSequencerElement();
    this.clipEditor.htmlElement.classList.add(CLIP_EDITOR_CLASS);
    this.htmlElement.append(this.clipEditor.htmlElement);

    service.observeMidiClipNode(this.clipId)
      .pipe(pluck('duration'))
      .subscribe((duration) => this.clipEditor.noteSequencer.duration = duration);

    service.observeMidiClipNode(this.clipId)
      .pipe(pluck('timeSignature'))
      .subscribe((signature) => {
        this.clipEditor.noteSequencer.signatureLower = signature.lower;
        this.clipEditor.noteSequencer.signatureUpper = signature.upper;
      });

    service.observeMidiClipNode(this.clipId)
      .pipe(pluck('flags'))
      .subscribe((flags) => this.refreshFlags(flags));

    service.observeMidiClipNode(this.clipId)
      .pipe(pluck('notes'))
      .subscribe((notes) => this.refreshNotes(notes));

    this.clipEditor.noteSequencer.notesChanged$.pipe(
      map(notes => notes.map(n => ({...n}))),
    ).subscribe(notes => commandManager.perform(setMidiClipNotes({id: this.clipId, value: notes})));

    this.clipEditor.noteSequencer.flagDragged$.pipe(
      switchMap((flag) => this.service.setMidiClipFlagTime(this.clipId, flag.id, flag.time)),
    ).subscribe();

    service.playBarPositions$.subscribe((positions) => {
      // TODO handle multiple bars by clip
      const playBarForThisClip = positions.find(p => p.clipId === this.clipId);

      if (playBarForThisClip != null) {
        this.clipEditor.noteSequencer.setPlayBarPosition(playBarForThisClip.time);
      } else {
        this.clipEditor.noteSequencer.setPlayBarPosition(null);
      }
    });
  }

  private refreshFlags(flags: MidiFlagState[]): void {
    this.clipEditor.noteSequencer.setFlags(flags.map(f => ({
      direction: f.kind === 'inlet' ? FlagDirection.right : FlagDirection.left,
      label: f.name,
      color: f.color,
      time: f.time,
      selected: false,
      id: f.id,
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
