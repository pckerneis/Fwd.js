import { Point } from '../canvas/Rectangle';
import { UnregisteredConnectionState } from '../GraphComponent/canvas-components/GraphRoot';
import { GraphSequencerService } from '../services/graph-sequencer.service';
import {
  ConnectionState,
  GraphItemState,
  InitNodeState,
  MidiClipNodeState,
  SelectableGraphItem,
} from '../state/project.state';
import { CommandFactory, commandManager, CommandPerformer } from './command-manager';

export enum CommandIds {
  createAndAddInitNode = 'createAndAddInitNode',
  createAndAddMidiClipNode = 'createAndAddMidiClipNode',
  addConnection = 'addConnection',
  deleteGraphSelection = 'deleteGraphSelection',
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

export function registerGraphSequencerCommands(service: GraphSequencerService): void {
  commandManager.addPerformerFactory(() => createAndAddInitNodePerformer(service));
  commandManager.addPerformerFactory(() => createAndAddMidiClipNodePerformer(service));
  commandManager.addPerformerFactory(() => addConnectionPerformer(service));
  commandManager.addPerformerFactory(() => deleteGraphSelectionPerformer(service));
}
