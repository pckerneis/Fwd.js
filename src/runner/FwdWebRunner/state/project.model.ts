import { getMidiOutputNames, getOutputByName } from '../../../fwd/midi/FwdMidi';
import { FwdScheduler } from '../../../fwd/scheduler/FwdScheduler';
import { ObservableListState, ObservableState } from './observable-state';
import {
  ConnectionState,
  GraphSequencerState,
  InitNodeState,
  MidiClipNodeState,
  NodeState,
  ProjectState,
} from './project.state';

/*
 * Main service for state management.
 * Offers a centralized way of mutating the project state and expose observers.
 */
export class ProjectModel {
  private _projectObserver: ObservableState<ProjectState>;
  private _graphObserver: ObservableState<GraphSequencerState>;
  private _nodesObserver: ObservableListState<NodeState>;
  private _connectionsObserver: ObservableListState<ConnectionState>;

  constructor() {
  }

  public get sequencer(): ObservableState<GraphSequencerState> {
    return this._graphObserver;
  }

  public get nodes(): ObservableListState<NodeState> {
    return this._nodesObserver;
  }

  public get connections(): ObservableListState<ConnectionState> {
    return this._connectionsObserver;
  }

  public loadProject(state: ProjectState): void {
    this._projectObserver = new ObservableState<ProjectState>(state);
    this._graphObserver = this._projectObserver.innerObserver('graphSequencer');
    this._nodesObserver = this._graphObserver.listObserver('nodes');
    this._connectionsObserver = this._graphObserver.listObserver('connections');
  }

  public addInitNode(nodeState: InitNodeState): ObservableState<NodeState> {
    return this.nodes.add(nodeState);
  }

  public addConnection(connection: ConnectionState): void {
    this.connections.add(connection);
  }

  public addMidiClipNode(midiClipNode: MidiClipNodeState): ObservableState<NodeState> {
    return this.nodes.add(midiClipNode);
  }

  public startPlayback(scheduler: FwdScheduler): void {
    const initNodes = this.nodes.get()
      .filter(n => n.kind === 'Init');

    initNodes.forEach(initNode => {
      this.fireNextNodes(scheduler, initNode, 0);
    });
  }

  private fireNextNodes(scheduler: FwdScheduler,
                        startNode: NodeState,
                        when: number): void {
    const connectedClips = this.connections.get()
      .map((connection) => {
        if (connection.sourceNode === startNode.id) {
          return connection.targetNode;
        } else {
          return undefined;
        }
      })
      .filter(n => Boolean(n))
      .map(id => this.nodes.get().find(n => n.id === id));

    scheduler.scheduleAhead(when, () => {
      connectedClips.forEach(clip => {
        if (clip.kind === 'MidiClip') {
          this.fireMidiClip(scheduler, clip);
        }
      });
    });
  }

  private fireMidiClip(scheduler: FwdScheduler, clip: MidiClipNodeState): void {
    const startTime = clip.flags.find(c => c.kind === 'inlet')?.time || 0;
    const endTime = clip.flags.find(c => c.kind === 'outlet')?.time || 0;
    const notesToPlay = clip.notes
      .map((note) => ({...note, time: note.time - startTime}))
      .filter(n => n.time >= 0)
      .filter(n => n.time < endTime);

    const output = getOutputByName(getMidiOutputNames()[1]);

    notesToPlay.forEach((note) => {
      scheduler.scheduleAhead(note.time, () => {
        console.log(note);
        output.playNote(note.pitch, 1, {
          velocity: note.velocity,
          duration: note.duration * 1000,
        });
      });
    });

    this.fireNextNodes(scheduler, clip, endTime - startTime);
  }
}
