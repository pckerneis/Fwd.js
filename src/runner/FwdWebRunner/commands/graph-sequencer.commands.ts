import { GraphSequencerService } from '../services/graph-sequencer.service';
import { ConnectionState, InitNodeState, MidiClipNodeState } from '../state/project.state';
import { CommandFactory, commandManager, CommandPerformer } from './command-manager';

export enum CommandIds {
  createAndAddInitNode = 'createAndAddInitNode',
  createAndAddMidiClipNode = 'createAndAddMidiClipNode',
  addConnection = 'addConnection',
}

export const createAndAddInitNode: CommandFactory<InitNodeState> = (state: InitNodeState) => {
  return {
    id: CommandIds.createAndAddInitNode,
    payload: state,
  };
};

function createAndAddInitNodePerformer(service: GraphSequencerService): CommandPerformer<InitNodeState> {
  return {
    canPerform: command => command.id === CommandIds.createAndAddInitNode,
    perform: command => service.addInitNode(command.payload).subscribe(),
    undo: command => service.removeNodeById(command.payload.id).subscribe(),
  };
}

export const createAndAddMidiClipNode: CommandFactory<MidiClipNodeState> = (state) => {
  return {
    id: CommandIds.createAndAddMidiClipNode,
    payload: state,
  };
};

function createAndAddMidiClipNodePerformer(service: GraphSequencerService): CommandPerformer<MidiClipNodeState> {
  return {
    canPerform: command => command.id === CommandIds.createAndAddMidiClipNode,
    perform: command => service.addMidiClipNode(command.payload).subscribe(),
    undo: command => service.removeNodeById(command.payload.id).subscribe(),
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
  };
}

export function registerGraphSequencerCommands(service: GraphSequencerService): void {
  commandManager.addPerformer(createAndAddInitNodePerformer(service));
  commandManager.addPerformer(createAndAddMidiClipNodePerformer(service));
  commandManager.addPerformer(addConnectionPerformer(service));
}
