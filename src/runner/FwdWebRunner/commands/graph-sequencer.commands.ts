import { ProjectModel } from '../state/project.model';
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

function createAndAddInitNodePerformer(model: ProjectModel): CommandPerformer<InitNodeState> {
  return {
    canPerform: command => command.id === CommandIds.createAndAddInitNode,
    perform: command => model.addInitNode(command.payload),
    undo: command => model.removeNodeById(command.payload.id),
  };
}

export const createAndAddMidiClipNode: CommandFactory<MidiClipNodeState> = (state) => {
  return {
    id: CommandIds.createAndAddMidiClipNode,
    payload: state,
  };
};

function createAndAddMidiClipNodePerformer(model: ProjectModel): CommandPerformer<MidiClipNodeState> {
  return {
    canPerform: command => command.id === CommandIds.createAndAddMidiClipNode,
    perform: command => model.addMidiClipNode(command.payload),
    undo: command => model.removeNodeById(command.payload.id),
  };
}

export const addConnection: CommandFactory<ConnectionState> = (state) => {
  return {
    id: CommandIds.addConnection,
    payload: state,
  };
};

function addConnectionPerformer(model: ProjectModel): CommandPerformer<ConnectionState> {
  return {
    canPerform: command => command.id === CommandIds.addConnection,
    perform: command => model.addConnection(command.payload),
    undo: command => model.removeConnection(command.payload),
  };
}

export function registerGraphSequencerCommands(model: ProjectModel): void {
  commandManager.addPerformer(createAndAddInitNodePerformer(model));
  commandManager.addPerformer(createAndAddMidiClipNodePerformer(model));
  commandManager.addPerformer(addConnectionPerformer(model));
}
