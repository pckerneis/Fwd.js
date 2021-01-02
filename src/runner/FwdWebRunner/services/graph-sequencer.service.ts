import { Observable } from 'rxjs';
import { map, pluck, tap } from 'rxjs/operators';
import { ComponentBounds, ComponentPosition } from '../canvas/BaseComponent';
import { SelectableItem } from '../canvas/shared/SelectedItemSet';
import { Connection } from '../GraphComponent/canvas-components/Connection';
import { GraphNode } from '../GraphComponent/canvas-components/GraphNode';
import { ConnectionState, GraphSequencerState, InitNodeState, MidiClipNodeState, NodeState } from '../state/project.state';
import { MidiClipNodeService, NodeService } from './midi-clip-node.service';
import { SequenceGenerator } from './sequence-generator';
import { StoreBasedService } from './store-based.service';

export class GraphSequencerService extends StoreBasedService<GraphSequencerState> {

  public nodes$: Observable<NodeState[]>;
  public connections$: Observable<ConnectionState[]>;
  private readonly _nodeServices: Map<number, NodeService<any>> = new Map();

  private readonly _idSequence: SequenceGenerator = new SequenceGenerator();

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
    return super.snapshot.nodes.map(n => ({
      ...this._nodeServices.get(n.id).snapshot,
    }));
  }

  public createAndAddInitNode(position: ComponentPosition): Observable<NodeState> {
    const initNode: InitNodeState = {
      kind: 'Init',
      id: this._idSequence.next(),
      outletId: this._idSequence.next(),
      label: 'Init',
      selected: false,
      bounds: {...position, width: 120, height: 24},
    }

    const updatedNodes = [...this.snapshot.nodes, initNode];
    return this.update('nodes', updatedNodes).pipe(map(state => state.nodes[state.nodes.length - 1]));
  }

  public createAndAddMidiClipNode(position: ComponentPosition): Observable<NodeState> {
    const defaultDuration = 16;

    const midiClipNode: MidiClipNodeState = {
      kind: 'MidiClip',
      id: this._idSequence.next(),
      label: 'MidiClip',
      selected: false,
      bounds: {...position, width: 120, height: 24},
      flags: [
        {
          id: this._idSequence.next(),
          kind: 'inlet',
          name: 'in',
          color: 'grey',
          time: 0,
        },
        {
          id: this._idSequence.next(),
          kind: 'outlet',
          name: 'out',
          color: 'grey',
          time: defaultDuration,
        },
      ],
      notes: [],
      duration: defaultDuration,
      timeSignature: {upper: 4, lower: 4},
    }

    const updatedNodes = [...this.snapshot.nodes, midiClipNode];
    return this.update('nodes', updatedNodes).pipe(map(state => state.nodes[state.nodes.length - 1]));
  }

  public addNode(newNode: NodeState): Observable<GraphSequencerState> {
    const updatedNodes = [...this.snapshot.nodes, newNode];
    return this.update('nodes', updatedNodes);
  }

  public removeNodeById(nodeId: number): Observable<GraphSequencerState> {
    const updatedNodes = this.snapshot.nodes.filter(n => n.id !== nodeId);
    return this.update('nodes', updatedNodes).pipe(
      tap(() => {
        const service = this._nodeServices.get(nodeId);
        if (service != null) {
          service.complete();
          this._nodeServices.set(nodeId, undefined);
        }
      }));
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

  public getMidiNodeService<T extends NodeState>(id: number, initialState: MidiClipNodeState): MidiClipNodeService {
    if (! Boolean(this._nodeServices.get(id))) {
      this._nodeServices.set(id, new MidiClipNodeService(initialState, this));
    }

    const service = this._nodeServices.get(id);

    if (! (service instanceof MidiClipNodeService)) {
      throw new Error('Bad node service type ! Expected MidiClipNodeService.');
    }

    return service as MidiClipNodeService;
  }

  public getNodeService<T extends NodeState>(id: number, initialState: T): NodeService<T> {
    if (! Boolean(this._nodeServices.get(id))) {
      this._nodeServices.set(id, new NodeService<T>(initialState));
    }

    return this._nodeServices.get(id);
  }

  public disconnectPin(id: number): Observable<GraphSequencerState> {
    const updatedConnections = this.snapshot.connections
      .filter(c => c.targetPinId !== id && c.sourcePinId !== id);
    return this.update('connections', updatedConnections);
  }

  public loadState(graphState: GraphSequencerState): void {
    this._nodeServices.forEach((service) => service.complete());
    this._nodeServices.clear();
    this._state$.next(graphState);
  }

  public nodeBoundsChanged(nodes: GraphNode[]): void {
    nodes.forEach(n => {
      this.setNodeBounds(n.id, n.getBounds()).subscribe();
    })
  }

  public selectionChanged(items: SelectableItem[]): void {
    const selectedNodes = items
      .filter(i => i instanceof GraphNode)
      .map(i => (i as GraphNode).id);

    const selectedConnections: Connection[] = items
      .filter(i => i instanceof Connection) as Connection[];

    const updatedNodes = this.snapshot.nodes
      .map(n => ({...n, selected: selectedNodes.includes(n.id)}));

    const updatedConnections = this.snapshot.connections
      .map(c => {
        const selected = selectedConnections.find(selected =>
          (selected.first === c.sourcePinId && selected.second === c.targetPinId)
          || (selected.second === c.sourcePinId && selected.first === c.targetPinId));

        return {...c, selected: Boolean(selected)};
      });

    updatedNodes.forEach(node => {
      const nodeService = this._nodeServices.get(node.id);
      if (nodeService != null) {
        nodeService.setSelected(node.selected);
      }
    });

    this.update('connections', updatedConnections);
  }

  private setNodeBounds(id: number, bounds: ComponentBounds): Observable<any> {
    const midiClipService = this._nodeServices.get(id);

    if (midiClipService == null) {
      throw new Error('Cannot find service for node ' + id);
    }

    return midiClipService.setBounds(bounds);
  }
}

function areConnectionsEqual(first: ConnectionState, second: ConnectionState): boolean {
  return first.targetNode === second.targetNode
    && first.sourceNode === second.sourceNode
    && first.sourcePinId === second.sourcePinId
    && first.targetPinId === second.sourcePinId
}
