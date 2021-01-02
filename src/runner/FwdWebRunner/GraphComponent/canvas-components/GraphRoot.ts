import { Observable, Subject } from 'rxjs';
import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentBounds, ComponentMouseEvent, ComponentPosition } from '../../canvas/BaseComponent';
import { SelectableItem, SelectedItemSet } from '../../canvas/shared/SelectedItemSet';
import { squaredDistance } from '../../NoteSequencer/canvas-components/RenderHelpers';
import { ConnectionState } from '../../state/project.state';
import { Connection, TemporaryConnection } from './Connection';
import { GraphNode } from './GraphNode';
import { OutletPin, Pin } from './Pin';
import { ViewportArea } from './ViewportArea';

export class GraphRoot extends Component {
  public readonly selection: SelectedItemSet<SelectableItem> = new SelectedItemSet();

  public readonly connectionAdded$: Observable<ConnectionState>;
  public readonly nodeBoundsChanged$: Observable<GraphNode[]>
  public readonly selectionChanged$: Observable<SelectableItem[]>;

  private readonly _connectionAddedSubject$: Subject<ConnectionState>;
  private readonly _nodeBoundsChangedSubject$: Subject<GraphNode[]>;
  private readonly _selectionChangedSubject$: Subject<SelectableItem[]>;

  private readonly _viewportArea: ViewportArea;

  private _temporaryConnection: TemporaryConnection = null;

  private readonly _nodes: ArrayList<GraphNode> = new ArrayList<GraphNode>();
  private readonly _connections: ArrayList<Connection> = new ArrayList<Connection>();

  // TODO: move this in utility class ?
  private componentDragReady: boolean;
  private positionsAtMouseDown: Map<string, ComponentBounds> = new Map();

  constructor() {
    super();

    this._viewportArea = new ViewportArea(this);
    this.addAndMakeVisible(this._viewportArea);

    this._connectionAddedSubject$ = new Subject<ConnectionState>();
    this.connectionAdded$ = this._connectionAddedSubject$.asObservable();

    this._nodeBoundsChangedSubject$ = new Subject();
    this.nodeBoundsChanged$ = this._nodeBoundsChangedSubject$.asObservable();

    this._selectionChangedSubject$ = new Subject<SelectableItem[]>();
    this.selectionChanged$ = this._selectionChangedSubject$.asObservable();

    this.selection.onchange = (items) => this._selectionChangedSubject$.next(items);
  }

  public get temporaryConnection(): TemporaryConnection {
    return this._temporaryConnection;
  }

  public get nodes(): ArrayList<GraphNode> {
    return this._nodes;
  }

  public get connections(): ArrayList<Connection> {
    return this._connections;
  }

  public get hasTemporaryConnection(): boolean {
    return this._temporaryConnection != null;
  }

  public initiateTemporaryConnection(sourcePin: Pin, event: ComponentMouseEvent): void {
    this._temporaryConnection = {
      sourcePin,
      endPosition: event.position,
    };
  }

  public temporaryConnectionDragged(event: ComponentMouseEvent): void {
    if (this._temporaryConnection != null) {
      const suitablePin = this.findSuitablePinNearby(event.position, this._temporaryConnection.sourcePin);
      this._temporaryConnection.endPosition = suitablePin?.getBoundsInGraph().center || event.position;
      this.repaint();
    }
  }

  public temporaryConnectionReleased(event: ComponentMouseEvent): void {
    if (this._temporaryConnection != null) {
      const suitablePin = this.findSuitablePinNearby(event.position, this._temporaryConnection.sourcePin);

      if (suitablePin != null) {
        this.connectionAdded(this._temporaryConnection.sourcePin, suitablePin, true);
      }

      this._temporaryConnection = null;
      this.repaint();
    }
  }

  public addNode(node: GraphNode): void {
    this._nodes.add(node);
    this._viewportArea.addAndMakeVisible(node);
    this.resized();
  }

  public removeNode(id: string): void {
    const node = this._nodes.array.find(n => n.id === id);

    if (node != null) {
      this.disconnect(node);
      this._nodes.remove(node);
      this._viewportArea.removeChild(node);
      this.resized();
    }
  }

  public arePinsConnected(first: Pin, second: Pin): Boolean {
    for (let connection of this._connections.array) {
      if ((connection.first === first.id && connection.second === second.id)
        || (connection.second === first.id && connection.first === second.id)) {
        return true;
      }
    }

    return false;
  }

  public addConnection(first: Pin, second: Pin, selected: boolean): void {
    if (! this.arePinsConnected(first, second)) {
      this._connections.add(new Connection(this, first.id, second.id, selected));
      this.repaint();
    }
  }

  public setConnections(newConnections: Connection[]): void {
    this._connections.reset(newConnections);
    this.repaint();
  }

  public removeConnection(first: string, second: string): void {
    this._connections.remove(this.findConnection(first, second));
    this.repaint();
  }

  public disconnect(node: GraphNode): void {
    const isConnectionAffected = (c: Connection) => node.inlets.array.map(p => p.id).includes(c.first)
      || node.outlets.array.map(p => p.id).includes(c.first)
      || node.inlets.array.map(p => p.id).includes(c.second)
      || node.outlets.array.map(p => p.id).includes(c.second);

    this._connections.reset(this.connections.array.filter(c => ! isConnectionAffected(c)));

    this.repaint();
  }

  public findPin(id: string): Pin {
    for (let node of this.nodes.array) {
      for (let pin of node.inlets.array) {
        if (pin.id === id) {
          return pin;
        }
      }
      for (let pin of node.outlets.array) {
        if (pin.id === id) {
          return pin;
        }
      }
    }

    return null;
  }

  public clearAll(): void {
    this._connections.clear();
    this._nodes.array.forEach(n => this._viewportArea.removeChild(n));
    this._nodes.clear();
    this.repaint();
  }

  public moveSelection(event: ComponentMouseEvent): void {
    if (this.selection.isEmpty())
      return;

    if (! this.componentDragReady) {
      this.selection.getItems().forEach(item => {
        if (item instanceof GraphNode) {
          this.positionsAtMouseDown.set(item.id, item.getBounds());
        }
      });
      this.componentDragReady = true;
    }

    const dragOffset = event.getDragOffset();

    for (const item of this.selection.getItems()) {
      if (item instanceof GraphNode) {
        item.setBounds(this.positionsAtMouseDown.get(item.id).translated(dragOffset));
      }
    }
  }

  public resetComponentDrag(): void {
    this.componentDragReady = false;
    this.positionsAtMouseDown.clear();

    if (! this.selection.isEmpty()) {
      this._nodeBoundsChangedSubject$.next(this.selection.getItems()
        .filter(item => item instanceof GraphNode) as GraphNode[]);
    }
  }

  public findSelectionBounds(): { top: number, bottom: number, left: number, right: number } {
    let left: number = Infinity;
    let right: number = -Infinity;
    let top: number = Infinity;
    let bottom: number = -Infinity;

    this.selection.getItems().forEach((item) => {
      if (item instanceof Component) {
        const bounds = item.getBounds();

        if (left == null || bounds.x < left) {
          left = bounds.x;
        }

        if (right == null || bounds.x + bounds.width > right) {
          right = bounds.x + bounds.width;
        }

        if (top == null || bounds.y < top) {
          top = bounds.y;
        }

        if (bottom == null || bounds.y + bounds.height > bottom) {
          bottom = bounds.y + bounds.height;
        }
      }
    });

    return {left, right, top, bottom};
  }

  public resized(): void {
    const bounds = this.getLocalBounds();
    this._viewportArea.setBounds(bounds);

    this.repaint();
  }

  public render(g: CanvasRenderingContext2D): void {
  }

  private findSuitablePinNearby(position: ComponentPosition, sourcePin: Pin): Pin | null {
    const allowedSquaredDistance = 10 ** 2;

    const checkPin = (pin: Pin, other: Pin) => {
      const pinCenter = pin.getBoundsInGraph().center;
      return squaredDistance(position.x, position.y, pinCenter.x, pinCenter.y) < allowedSquaredDistance
        && pin.canConnect(other);
    };

    for (let node of this._nodes.array) {
      for (let pin of node.inlets.array) {
        if (checkPin(pin, sourcePin)) {
          return pin;
        }
      }

      for (let pin of node.outlets.array) {
        if (checkPin(pin, sourcePin)) {
          return pin;
        }
      }
    }

    return null;
  }

  private findConnection(first: string, second: string): Connection {
    return this._connections.array.find(c => c.first === first && c.second === second);
  }

  private connectionAdded(first: Pin, second: Pin, selected: boolean): void {
    if (first instanceof OutletPin) {
      this._connectionAddedSubject$.next({
        sourceNode: first.parentNode.id,
        sourcePinId: first.id,
        targetNode: second.parentNode.id,
        targetPinId: second.id,
        selected: selected,
      });
    } else {
      this._connectionAddedSubject$.next({
        targetNode: first.parentNode.id,
        targetPinId: first.id,
        sourceNode: second.parentNode.id,
        sourcePinId: second.id,
        selected: selected,
      });
    }
  }
}
