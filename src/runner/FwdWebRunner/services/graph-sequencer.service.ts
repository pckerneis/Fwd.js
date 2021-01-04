import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, pluck, tap } from 'rxjs/operators';
import { IRectangle, Point, Rectangle } from '../canvas/Rectangle';
import { Connection } from '../GraphComponent/canvas-components/Connection';
import { GraphObjectBounds, UnregisteredConnectionState } from '../GraphComponent/canvas-components/GraphRoot';
import { TimeSignature } from '../NoteSequencer/note-sequencer';
import {
  ConnectionState,
  FlagKind,
  GraphItemState,
  GraphSequencerState,
  InitNodeState,
  MidiClipNodeState,
  MidiFlagState,
  MidiNoteState,
  NodeState,
} from '../state/project.state';
import { SequenceGenerator } from './sequence-generator';
import { StoreBasedService } from './store-based.service';

interface PlayBarPosition {
  clipId: number;
  time: number;
}

function isMidiClipNode(node: NodeState): node is MidiClipNodeState {
  return node.kind === 'MidiClip';
}

export class GraphSequencerService extends StoreBasedService<GraphSequencerState> {
  public readonly nodeAdded$: Observable<NodeState>;
  public readonly connectionAdded$: Observable<ConnectionState>;
  public readonly connectionRemoved$: Observable<ConnectionState>;
  public readonly playBarPositions$: Observable<PlayBarPosition[]>;
  public readonly nodeRemoved$: Observable<number>;
  public readonly nodesMoved$: Observable<GraphObjectBounds[]>;

  private readonly _idSequence: SequenceGenerator = new SequenceGenerator();
  private readonly nodes$: Observable<NodeState[]>;
  private readonly _playBarPositions: BehaviorSubject<PlayBarPosition[]> = new BehaviorSubject<PlayBarPosition[]>([]);
  private readonly _connectionAddedSubject: Subject<ConnectionState> = new Subject<ConnectionState>();
  private readonly _connectionRemovedSubject: Subject<ConnectionState> = new Subject<ConnectionState>();
  private readonly _nodeRemovedSubject: Subject<number> = new Subject<number>();
  private readonly _nodeAddedSubject: Subject<NodeState> = new Subject<NodeState>();
  private readonly _nodesMovedSubject: Subject<GraphObjectBounds[]> = new Subject<GraphObjectBounds[]>();

  constructor(state: GraphSequencerState) {
    super(state);
    this.nodes$ = this.state$.pipe(pluck('nodes'));
    this.connectionAdded$ = this._connectionAddedSubject.asObservable();
    this.connectionRemoved$ = this._connectionRemovedSubject.asObservable();
    this.playBarPositions$ = this._playBarPositions.asObservable();
    this.nodeAdded$ = this._nodeAddedSubject.asObservable();
    this.nodeRemoved$ = this._nodeRemovedSubject.asObservable();
    this.nodesMoved$ = this._nodesMovedSubject.asObservable();
  }

  private static checkFlagKind(kind: string): kind is FlagKind {
    const knownFlags = ['none', 'inlet', 'outlet', 'jump'];

    if (! knownFlags.includes(kind)) {
      throw new Error('Unknown flag kind ' + kind);
    }

    return true;
  }

  public createAndAddInitNode(position: Point): Observable<NodeState> {
    const initNode: InitNodeState = {
      kind: 'Init',
      id: this._idSequence.next(),
      outletId: this._idSequence.next(),
      label: 'Init',
      selected: false,
      bounds: {...position, width: 120, height: 24},
    }

    const updatedNodes = [...this.snapshot.nodes, initNode];
    return this.update('nodes', updatedNodes).pipe(
      map(state => state.nodes[state.nodes.length - 1]),
      tap((state) => this._nodeAddedSubject.next(state)));
  }

  public createAndAddMidiClipNode(position: Point): Observable<NodeState> {
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
    return this.update('nodes', updatedNodes).pipe(
      map(state => state.nodes[state.nodes.length - 1]),
      tap((state) => this._nodeAddedSubject.next(state)));
  }

  public addNode(newNode: NodeState): Observable<GraphSequencerState> {
    const updatedNodes = [...this.snapshot.nodes, newNode];
    return this.update('nodes', updatedNodes)
      .pipe(tap(() => this._nodeAddedSubject.next(newNode)));
  }

  public removeNodeById(nodeId: number): Observable<GraphSequencerState> {
    const updatedNodes = this.snapshot.nodes.filter(n => n.id !== nodeId);
    this._nodeRemovedSubject.next(nodeId);
    return this.update('nodes', updatedNodes);
  }

  public addConnection(connection: ConnectionState): Observable<GraphSequencerState> {
    const updated = [...this.snapshot.connections, connection];
    return this.update('connections', updated)
      .pipe(tap(() => this._connectionAddedSubject.next(connection)));
  }

  public removeConnection(connectionToRemove: ConnectionState): Observable<GraphSequencerState> {
    const updated = [...this.snapshot.connections];
    updated.splice(updated.indexOf(updated.find(c => areConnectionsEqual(c, connectionToRemove))));
    return this.update('connections', updated)
      .pipe(tap(() => this._connectionRemovedSubject.next(connectionToRemove)));
  }

  public disconnectPin(id: number): Observable<GraphSequencerState> {
    const updatedConnections = this.snapshot.connections
      .filter(c => c.targetPinId !== id && c.sourcePinId !== id);
    return this.update('connections', updatedConnections);
  }

  public addItems(items: GraphItemState[]): void {
    const nodesToAdd = items
      .filter((item) => item.kind === 'MidiClip' || item.kind === 'Init') as NodeState[];

    const connectionsToAdd = items
      .filter((item) => item.kind === 'Connection') as ConnectionState[];

    nodesToAdd.forEach(n => this._nodeAddedSubject.next(n));
    connectionsToAdd.forEach(c => this._connectionAddedSubject.next(c));

    this.update('nodes', [...this.snapshot.nodes, ...nodesToAdd]).subscribe();
    this.update('connections', [...this.snapshot.connections, ...connectionsToAdd]).subscribe();
  }

  public deleteItems(idsToRemove: number[]): GraphItemState[] {
    const updatedConnections = this.snapshot.connections
      .filter(c => idsToRemove.includes(c.targetNode) || idsToRemove.includes(c.sourceNode));
    const allRemoved = [...idsToRemove, ...updatedConnections.map(c => c.id)];

    const states = allRemoved.map((id) =>
      this.snapshot.nodes.find((n) => n.id === id)
      || this.snapshot.connections.find((c) => c.id === id))
      .filter(item => !! item);

    this.update('nodes', this.snapshot.nodes.filter((n) => ! allRemoved.includes(n.id))).subscribe();
    this.update('connections', this.snapshot.connections.filter((c) => ! allRemoved.includes(c.id))).subscribe();

    states.forEach(state => {
      if (state.kind === 'MidiClip' || state.kind === 'Init') {
        this._nodeRemovedSubject.next(state.id);
      } else {
        this._connectionRemovedSubject.next(state);
      }
    });
    return states;
  }

  public createAndAddConnection(unregisteredConnectionState: UnregisteredConnectionState): Observable<ConnectionState> {
    const connectionState: ConnectionState = {
      ...unregisteredConnectionState,
      id: this._idSequence.next(),
      kind: 'Connection',
      selected: false,
    };

    return this.addConnection(connectionState).pipe(
      map(() => connectionState));
  }

  public loadState(graphState: GraphSequencerState): void {
    this._state$.next(graphState);
  }

  public setNodesBounds(nodes: { id: number, bounds: IRectangle }[]): void {
    nodes.forEach(n => {
      this.setNodeBounds(n.id, Rectangle.fromIBounds(n.bounds)).subscribe();
    });

    this._nodesMovedSubject.next(nodes);
  }

  public selectionChanged(items: number[]): void {
    const updatedNodes = this.snapshot.nodes.map(n => ({...n, selected: items.includes(n.id)}));
    this.update('nodes', updatedNodes);
    const updatedConnections = this.snapshot.connections.map(c => ({...c, selected: items.includes(c.id)}));
    this.update('connections', updatedConnections);
  }

  public setNodeBounds(id: number, bounds: Rectangle): Observable<any> {
    return this.updateOneNode(id, 'bounds', bounds);
  }

  public setNodeLabel(id: any, newLabel: string): Observable<any> {
    return this.updateOneNode(id, 'label', newLabel);
  }

  public setMidiClipDuration(clipId: number, newDuration: number): Observable<MidiClipNodeState> {
    return this.updateMidiClipNode(clipId, 'duration', newDuration);
  }

  public setMidiClipSignature(clipId: number, timeSignature: TimeSignature): Observable<MidiClipNodeState> {
    return this.updateMidiClipNode(clipId, 'timeSignature', timeSignature);
  }

  public findMidiClipNodeState(clipId: number): MidiClipNodeState {
    const n = this.snapshot.nodes.find((n) => n.id === clipId);
    if (n == null) throw new Error('Cannot find node with id ' + clipId);
    if (n.kind !== 'MidiClip') throw new Error('Cannot find MidiClipNode with id ' + clipId);
    return n as MidiClipNodeState;
  }

  public createAndAddMidiClipFlag(clipId: number, flag: Omit<MidiFlagState, 'id'>): Observable<MidiFlagState> {
    const newFlag = {
      ...flag,
      id: this._idSequence.next(),
    }
    const flags = this.getMidiClipFlags(clipId);
    return this.updateMidiClipNode(clipId, 'flags', [...flags, newFlag]).pipe(
      map((newState) => newState.flags.find(f => f.id === newFlag.id)),
    );
  }

  public removeMidiClipFlag(clipId: number, id: number): Observable<any> {
    const flags = this.getMidiClipFlags(clipId);
    return this.updateMidiClipNode(clipId, 'flags', flags.filter(f => f.id !== id));
  }

  public renameMidiClipFlag(clipId: number, flagId: number, value: string): Observable<MidiFlagState> {
    return this.updateMidiClipFlag(clipId, flagId, 'name', value);
  }

  public setMidiClipFlagTime(clipId: number, flagId: number, value: number): Observable<MidiFlagState> {
    return this.updateMidiClipFlag(clipId, flagId, 'time', value);
  }

  public setMidiClipFlagKind(clipId: number, flagId: number, value: string): Observable<MidiFlagState> {
    if (GraphSequencerService.checkFlagKind(value)) {
      return this.updateMidiClipFlag(clipId, flagId, 'kind', value);
    } // Will throw otherwise
  }

  public setMidiClipFlagJumpDestination(clipId: number, flagId: number, value: number): Observable<MidiFlagState> {
    return this.updateMidiClipFlag(clipId, flagId, 'jumpDestination', value);
  }

  public updateMidiClipFlag<K extends keyof MidiFlagState>(clipId: number,
                                                           flagId: number,
                                                           key: K,
                                                           value: MidiFlagState[K])
    : Observable<MidiFlagState> {
    const updated = this.getMidiClipFlags(clipId)
      .map(f => f.id === flagId ? ({...f, [key]: value}) : f);

    return this.updateMidiClipNode(clipId, 'flags', updated).pipe(
      map((newState) => newState.flags.find(f => f.id === flagId)));
  }

  public setMidiClipNotes(clipId: number, notes: MidiNoteState[]): Observable<MidiClipNodeState> {
    return this.updateMidiClipNode(clipId, 'notes', notes);
  }

  public updateOneNode<K extends keyof NodeState>(id: number, key: K, value: NodeState[K]): Observable<NodeState> {
    const updatedNodes = this.snapshot.nodes.map(n => n.id === id ? ({...n, [key]: value}) : n);
    return this.update('nodes', updatedNodes).pipe(
      map((updatedState) => updatedState.nodes.find(n => n.id === id)));
  }

  public updateMidiClipNode<K extends keyof MidiClipNodeState>(id: number,
                                                               key: K,
                                                               value: MidiClipNodeState[K]): Observable<MidiClipNodeState> {
    const updatedNodes = this.snapshot.nodes.map(n => n.id === id ? ({...n, [key]: value}) : n);
    return this.update('nodes', updatedNodes).pipe(
      map((updatedState) => updatedState.nodes.find(n => n.id === id)),
      filter((newState) => !! newState && isMidiClipNode(newState)),
      map(n => n as MidiClipNodeState)); // sigh
  }

  public observeMidiClipNode(nodeId: number): Observable<MidiClipNodeState> {
    return this.observeNode(nodeId).pipe(
      filter(n => !! n && isMidiClipNode(n)),
      map(n => n as MidiClipNodeState));  // sigh... cleanest way I found to avoid type error
  }

  public observeNode(nodeId: number): Observable<NodeState> {
    return this.nodes$.pipe(
      map((nodes) => nodes.find((n) => n.id === nodeId)),
      filter(n => !! n),
      distinctUntilChanged());
  }

  public getMidiClipFlags(clipId: number): MidiFlagState[] | null {
    const n = this.findMidiClipNodeState(clipId);
    return n?.flags;
  }

  public setPlayBarPositions(positions: PlayBarPosition[]): void {
    this._playBarPositions.next(positions);
  }

  public observeNodeRemoval(id: number): any {
    return this.nodeRemoved$.pipe(filter(nodeId => nodeId === id));
  }
}

function areConnectionsEqual(first: ConnectionState, second: ConnectionState): boolean {
  return first.targetNode === second.targetNode
    && first.sourceNode === second.sourceNode
    && first.sourcePinId === second.sourcePinId
    && first.targetPinId === second.sourcePinId
}
