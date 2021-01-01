import { Observable } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
import { ConnectionState, GraphSequencerState, InitNodeState, MidiClipNodeState, NodeState } from '../state/project.state';
import { MidiClipNodeService } from './midi-clip-node.service';
import { StoreBasedService } from './store-based.service';

export class GraphSequencerService extends StoreBasedService<GraphSequencerState> {

  public nodes$: Observable<NodeState[]>;
  public connections$: Observable<ConnectionState[]>;
  private readonly _midiClipNodeServices: Map<String, MidiClipNodeService> = new Map();

  constructor(state: GraphSequencerState) {
    super(state);
    this.nodes$ = this.state$.pipe(pluck('nodes'));
    this.connections$ = this.state$.pipe(pluck('connections'));
  }

  public get snapshot(): GraphSequencerState {
    const snapshot = super.snapshot;
    return {
      ...snapshot,
      nodes: this.getNodeStates(),
    }
  }

  public getNodeStates(): NodeState[] {
    return super.snapshot.nodes.map(n => {
      switch (n.kind) {
        case 'Init':
          return n;
        case 'MidiClip':
          return this._midiClipNodeServices.get(n.id).snapshot;
      }
    });
  }

  public addInitNode(nodeState: InitNodeState): Observable<NodeState> {
    const updatedNodes = [...this.snapshot.nodes, nodeState];
    return this.update('nodes', updatedNodes).pipe(map(state => state.nodes[state.nodes.length - 1]));
  }

  public addMidiClipNode(midiClipNode: MidiClipNodeState): Observable<NodeState> {
    const updatedNodes = [...this.snapshot.nodes, midiClipNode];
    return this.update('nodes', updatedNodes).pipe(map(state => state.nodes[state.nodes.length - 1]));
  }

  public removeNodeById(nodeId: string): Observable<GraphSequencerState> {
    const updatedNodes = [...this.snapshot.nodes];
    updatedNodes.splice(updatedNodes.indexOf(updatedNodes.find(n => n.id === nodeId)));
    return this.update('nodes', updatedNodes);
  }

  public addConnection(connection: ConnectionState): Observable<GraphSequencerState> {
    const updated = [...this.snapshot.connections, connection];
    return this.update('connections', updated);
  }

  public removeConnection(connectionToRemove: ConnectionState): Observable<GraphSequencerState> {
    const updated = [...this.snapshot.connections];
    updated.splice(updated.indexOf(updated.find(c => areConnectionsEqual(c, connectionToRemove))));
    return this.update('connections', updated);
  }

  public getMidiClipNodeService(id: string, initialState: MidiClipNodeState): MidiClipNodeService {
    if (! Boolean(this._midiClipNodeServices.get(id))) {
      this._midiClipNodeServices.set(id, new MidiClipNodeService(initialState, this));
    }

    return this._midiClipNodeServices.get(id);
  }

  public disconnectPin(id: string): Observable<GraphSequencerState> {
    const updatedConnections = this.snapshot.connections
      .filter(c => c.targetPinId !== id  && c.sourcePinId !== id);
    return this.update('connections', updatedConnections);
  }
}

function areConnectionsEqual(first: ConnectionState, second: ConnectionState): boolean {
  return first.targetNode === second.targetNode
    && first.sourceNode === second.sourceNode
    && first.sourcePinId === second.sourcePinId
    && first.targetPinId === second.sourcePinId
}
