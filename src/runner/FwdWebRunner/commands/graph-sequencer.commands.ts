import { Point } from '../canvas/Rectangle';
import { GraphSequencerService } from '../services/graph-sequencer.service';
import { ConnectionState, InitNodeState, MidiClipNodeState } from '../state/project.state';
import { CommandFactory, commandManager, CommandPerformer } from './command-manager';

export enum CommandIds {
  createAndAddInitNode = 'createAndAddInitNode',
  createAndAddMidiClipNode = 'createAndAddMidiClipNode',
  addConnection = 'addConnection',
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

export const addConnection: CommandFactory<ConnectionState> = (state) => {
  return {
    id: CommandIds.addConnection,
    payload: state,
  };
};

function addConnectionPerformer(service: GraphSequencerService): CommandPerformer<ConnectionState> {
  return {
    canPerform: command => command.id === CommandIds.addConnection,
    perform: command => service.addConnection(command.payload).subscribe(),
    undo: command => service.removeConnection(command.payload).subscribe(),
    redo: command => service.addConnection(command.payload).subscribe(),
  };
}

export function registerGraphSequencerCommands(service: GraphSequencerService): void {
  commandManager.addPerformerFactory(() => createAndAddInitNodePerformer(service));
  commandManager.addPerformerFactory(() => createAndAddMidiClipNodePerformer(service));
  commandManager.addPerformerFactory(() => addConnectionPerformer(service));
}
