import { Observable } from 'rxjs';
import { Point } from '../canvas/Rectangle';
import { GraphObjectBounds, UnregisteredConnectionState } from '../GraphComponent/canvas-components/GraphRoot';
import { TimeSignature } from '../NoteSequencer/note-sequencer';
import { GraphSequencerService } from '../services/graph-sequencer.service';
import {
  ConnectionState,
  GraphItemState,
  InitNodeState,
  MidiClipNodeState,
  MidiNoteState,
  SelectableGraphItem,
} from '../state/project.state';
import { CommandFactory, commandManager, CommandPerformer } from './command-manager';

export enum CommandIds {
  createAndAddInitNode = 'createAndAddInitNode',
  createAndAddMidiClipNode = 'createAndAddMidiClipNode',
  addConnection = 'addConnection',
  deleteGraphSelection = 'deleteGraphSelection',
  moveNodes = 'moveNodes',
  setNodeLabel = 'setNodeLabel',
  setMidiClipNotes = 'setMidiClipNotes',
  setMidiClipDuration = 'setMidiClipDuration',
  setMidiClipSignature = 'setMidiClipSignature',
}

export const createAndAddInitNode: CommandFactory<Point> = (position) => {
  return {
    id: CommandIds.createAndAddInitNode,
    payload: position,
  };
};

function createAndAddInitNodePerformer(service: GraphSequencerService): CommandPerformer<Point> {
  let addedNodeState: InitNodeState;
  return {
    canPerform: (command) => command.id === CommandIds.createAndAddInitNode,
    perform: (command) => {
      service.createAndAddInitNode(command.payload)
        .subscribe((state) => addedNodeState = state as InitNodeState)
    },
    undo: () => {
      if (addedNodeState != null) {
        service.removeNodeById(addedNodeState.id).subscribe();
      }
    },
    redo: () => {
      service.addNode(addedNodeState).subscribe();
    },
  };
}

export const createAndAddMidiClipNode: CommandFactory<Point> = (state) => {
  return {
    id: CommandIds.createAndAddMidiClipNode,
    payload: state,
  };
};

function createAndAddMidiClipNodePerformer(service: GraphSequencerService): CommandPerformer<Point> {
  let addedNodeState: MidiClipNodeState;
  return {
    canPerform: (command) => command.id === CommandIds.createAndAddMidiClipNode,
    perform: (command) => {
      service.createAndAddMidiClipNode(command.payload)
        .subscribe((state) => addedNodeState = state as MidiClipNodeState)
    },
    undo: () => {
      if (addedNodeState != null) {
        service.removeNodeById(addedNodeState.id).subscribe();
      }
    },
    redo: () => {
      service.addNode(addedNodeState).subscribe();
    },
  };
}

export const addConnection: CommandFactory<UnregisteredConnectionState> = (state) => {
  return {
    id: CommandIds.addConnection,
    payload: state,
  };
};

function addConnectionPerformer(service: GraphSequencerService): CommandPerformer<UnregisteredConnectionState> {
  let added: ConnectionState;
  return {
    canPerform: command => command.id === CommandIds.addConnection,
    perform: command => service.createAndAddConnection(command.payload)
      .subscribe((connectionState) => added = connectionState),
    undo: () => service.removeConnection(added).subscribe(),
    redo: () => service.addConnection(added).subscribe(),
  };
}

export const deleteGraphSelection: CommandFactory<SelectableGraphItem[]> = (state) => {
  return {
    id: CommandIds.deleteGraphSelection,
    payload: state,
  };
};

function deleteGraphSelectionPerformer(service: GraphSequencerService): CommandPerformer<SelectableGraphItem[]> {
  let deleted: GraphItemState[];

  return {
    canPerform: command => command.id === CommandIds.deleteGraphSelection,
    perform: command => deleted = service.deleteItems(command.payload),
    undo: () => service.addItems(deleted),
    redo: command => deleted = service.deleteItems(command.payload),
  };
}

export const moveNodes: CommandFactory<GraphObjectBounds[]> = (state) => {
  return {
    id: CommandIds.moveNodes,
    payload: state,
  };
};

function moveNodesPerformer(service: GraphSequencerService): CommandPerformer<GraphObjectBounds[]> {
  let previousPositions: GraphObjectBounds[];
  let newPositions: GraphObjectBounds[];

  return {
    canPerform: command => command.id === CommandIds.moveNodes,
    perform: command => {
      const ids = command.payload.map(node => node.id);
      previousPositions = service.snapshot.nodes
        .filter((n) => ids.includes(n.id))
        .map(n => ({id: n.id, bounds: n.bounds}));
      newPositions = command.payload.map(n => ({id: n.id, bounds: n.bounds}));

      service.setNodesBounds(newPositions);
    },
    undo: () => service.setNodesBounds(previousPositions),
    redo: () => service.setNodesBounds(newPositions),
  };
}

export const setNodeLabel: CommandFactory<{ id: number, name: string }> = (state) => {
  return {
    id: CommandIds.setNodeLabel,
    payload: state,
  };
};

function setNodeLabelPerformer(service: GraphSequencerService): CommandPerformer<{ id: number, name: string }> {
  let previousName: string;
  return {
    canPerform: command => command.id === CommandIds.setNodeLabel,
    perform: (command) => {
      previousName = service.snapshot.nodes.find(n => n.id === command.payload.id)?.label;
      service.setNodeLabel(command.payload.id, command.payload.name)
        .subscribe();
    },
    undo: (command) => service.setNodeLabel(command.payload.id, previousName)
      .subscribe(),
    redo: (command) => service.setNodeLabel(command.payload.id, command.payload.name)
      .subscribe(),
  };
}

type NotesUpdate = { id: number, value: MidiNoteState[] };

export const setMidiClipNotes: CommandFactory<NotesUpdate> = (state) => {
  return {
    id: CommandIds.setMidiClipNotes,
    payload: state,
  };
};

function setMidiClipNotesPerformer(service: GraphSequencerService): CommandPerformer<NotesUpdate> {
  return midiClipUpdatePerformer(CommandIds.setMidiClipNotes, service, 'notes',
    (id, v) => service.setMidiClipNotes(id, v));
}


type DurationUpdate = { id: number, value: number };

export const setMidiClipDuration: CommandFactory<DurationUpdate> = (state) => {
  return {
    id: CommandIds.setMidiClipDuration,
    payload: state,
  };
};

function setMidiClipDurationPerformer(service: GraphSequencerService): CommandPerformer<DurationUpdate> {
  return midiClipUpdatePerformer(CommandIds.setMidiClipDuration, service, 'duration',
    (id, v) => service.setMidiClipDuration(id, v));
}

type SignatureUpdate = { id: number, value: TimeSignature };

export const setMidiClipSignature: CommandFactory<SignatureUpdate> = (state) => {
  return {
    id: CommandIds.setMidiClipSignature,
    payload: state,
  };
};

function setMidiClipSignaturePerformer(service: GraphSequencerService): CommandPerformer<SignatureUpdate> {
  return midiClipUpdatePerformer(CommandIds.setMidiClipSignature, service, 'timeSignature',
    (id, v) => service.setMidiClipSignature(id, v));
}

export type MidiClipUpdate<K extends keyof MidiClipNodeState> = {
  id: number,
  value: MidiClipNodeState[K],
};

function midiClipUpdatePerformer<K extends keyof MidiClipNodeState>(
  commandId: CommandIds,
  service: GraphSequencerService,
  key: K,
  updater: (id: number, v: MidiClipNodeState[K]) => Observable<any>): CommandPerformer<MidiClipUpdate<K>> {
  let previous: MidiClipNodeState[K];

  return {
    canPerform: command => command.id === commandId,
    perform: (command) => {
      previous = service.findMidiClipNodeState(command.payload.id)?.[key];
      updater(command.payload.id, command.payload.value).subscribe();
    },
    undo: (command) => updater(command.payload.id, previous).subscribe(),
    redo: (command) => updater(command.payload.id, command.payload.value).subscribe(),
  };
}

export function registerGraphSequencerCommands(service: GraphSequencerService): void {
  commandManager.addPerformerFactory(() => createAndAddInitNodePerformer(service));
  commandManager.addPerformerFactory(() => createAndAddMidiClipNodePerformer(service));
  commandManager.addPerformerFactory(() => addConnectionPerformer(service));
  commandManager.addPerformerFactory(() => deleteGraphSelectionPerformer(service));
  commandManager.addPerformerFactory(() => moveNodesPerformer(service));
  commandManager.addPerformerFactory(() => setNodeLabelPerformer(service));
  commandManager.addPerformerFactory(() => setMidiClipNotesPerformer(service));
  commandManager.addPerformerFactory(() => setMidiClipDurationPerformer(service));
  commandManager.addPerformerFactory(() => setMidiClipSignaturePerformer(service));
}
