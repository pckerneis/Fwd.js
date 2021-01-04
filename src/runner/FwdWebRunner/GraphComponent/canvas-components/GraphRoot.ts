import { Observable, Subject } from 'rxjs';
import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { IRectangle, Point, Points, Rectangle } from '../../canvas/Rectangle';
import { SelectedItemSet } from '../../canvas/shared/SelectedItemSet';
import { squaredDistance } from '../../NoteSequencer/canvas-components/RenderHelpers';
import { ConnectionState } from '../../state/project.state';
import { Connection, TemporaryConnection } from './Connection';
import { GraphNode } from './GraphNode';
import { MiniMap } from './MiniMap';
import { OutletPin, Pin } from './Pin';
import { ViewportArea } from './ViewportArea';

export interface UnregisteredConnectionState {
  targetNode: number;
  targetPinId: number;
  sourceNode: number;
  sourcePinId: number;
}

export interface GraphObjectBounds {
  id: number,
  bounds: IRectangle
}

export class GraphRoot extends Component {
  public readonly selection: SelectedItemSet = new SelectedItemSet();

  public readonly addConnection$: Observable<UnregisteredConnectionState>;
  public readonly nodeBoundsChanged$: Observable<GraphObjectBounds[]>
  public readonly selectionChanged$: Observable<number[]>;

  private readonly _addConnectionSubject: Subject<UnregisteredConnectionState>;
  private readonly _changeNodeBoundsSubject: Subject<GraphObjectBounds[]>;

  private readonly _viewportArea: ViewportArea;
  private readonly _miniMap: MiniMap;

  private readonly _nodes: ArrayList<GraphNode> = new ArrayList<GraphNode>();
  private readonly _connections: ArrayList<Connection> = new ArrayList<Connection>();

  private _temporaryConnection: TemporaryConnection = null;

  // TODO: move this in utility class ?
  private componentDragReady: boolean;
  private boundsAtMouseDown: Map<number, Rectangle> = new Map();

  constructor() {
    super();

    this._addConnectionSubject = new Subject<ConnectionState>();
    this.addConnection$ = this._addConnectionSubject.asObservable();

    this._changeNodeBoundsSubject = new Subject();
    this.nodeBoundsChanged$ = this._changeNodeBoundsSubject.asObservable();

    this.selectionChanged$ = this.selection.selection$;
    this.selection.selection$.subscribe(selection => {
      this.nodes.array.forEach(n => n.selected = selection.includes(n.id));
      this.connections.array.forEach(c => c.selected = selection.includes(c.id));
      this.repaint();
    });

    this._viewportArea = new ViewportArea(this);
    this.addAndMakeVisible(this._viewportArea);

    this._miniMap = new MiniMap(this);
    this.addAndMakeVisible(this._miniMap);
  }

  public get selectedNodes(): GraphNode[] {
    return this.selection.items
      .map(id => this.findNode(id))
      .filter(node => !! node);
  };

  public get viewport(): ViewportArea {
    return this._viewportArea;
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
      const viewPortPosition = Points.add(event.position, {
        x: -this.viewport.getViewOffset().x,
        y: -this.viewport.getViewOffset().y,
      });
      const suitablePin = this.findSuitablePinNearby(viewPortPosition, this._temporaryConnection.sourcePin);
      this._temporaryConnection.endPosition = suitablePin?.getBoundsInGraph()
        .translated(this.viewport.getViewOffset())
        .center || event.position;
      this.repaint();
    }
  }

  public temporaryConnectionReleased(event: ComponentMouseEvent): void {
    if (this._temporaryConnection != null) {
      const viewPortPosition = Points.add(event.position, {
        x: -this.viewport.getViewOffset().x,
        y: -this.viewport.getViewOffset().y,
      });
      const suitablePin = this.findSuitablePinNearby(viewPortPosition, this._temporaryConnection.sourcePin);

      if (suitablePin != null) {
        this.createConnection(this._temporaryConnection.sourcePin, suitablePin);
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

  public removeNode(id: number): void {
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

  public addConnection(id: number, first: Pin, second: Pin, selected: boolean): void {
    if (! this.arePinsConnected(first, second)) {
      this._connections.add(new Connection(id, this, first.id, second.id, selected));
      this.repaint();
    }
  }

  public setConnections(newConnections: Connection[]): void {
    console.log('set connections')
    this._connections.reset(newConnections);
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

  public findPin(id: number): Pin {
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

  public moveSelection(event: ComponentMouseEvent): void {
    if (this.selection.isEmpty())
      return;

    if (! this.componentDragReady) {
      this.selectedNodes.forEach(node => this.boundsAtMouseDown.set(node.id, node.getBounds()));
      this.componentDragReady = true;
    }

    const dragOffset = event.getDragOffset();

    this.selectedNodes.forEach(node => node.setBounds(this.boundsAtMouseDown.get(node.id).translated(dragOffset)));
  }

  public resetComponentDragAndNotifyIfDragged(event: ComponentMouseEvent): void {
    this.componentDragReady = false;
    this.boundsAtMouseDown.clear();

    if (! this.selection.isEmpty() && ! Points.isOrigin(event.getDragOffset())) {
      this._changeNodeBoundsSubject.next(this.selectedNodes);
      this._miniMap.updatePreview();
    }
  }

  public findSelectionBounds(): { top: number, bottom: number, left: number, right: number } {
    let left: number = Infinity;
    let right: number = -Infinity;
    let top: number = Infinity;
    let bottom: number = -Infinity;

    this.selectedNodes.forEach((item) => {
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
    });

    return {left, right, top, bottom};
  }

  public setNodesBounds(movedNodes: { id: number, bounds: IRectangle }[]): void {
    this.nodes.array.forEach((ownedNode) => {
      const newBounds = movedNodes.find(n => n.id === ownedNode.id)?.bounds;

      if (newBounds != null) {
        ownedNode.setBounds(Rectangle.fromIBounds(newBounds));
      }
    });

    this.repaint();
    this._miniMap.updatePreview();
  }

  public removeConnection(id: number): void {
    this.connections.removeIfMatch(c => c.id === id);
    this.repaint();
  }

  public resized(): void {
    const bounds = this.getLocalBounds();
    this._viewportArea.setBounds(bounds);

    const miniMapSize = 150;

    this._miniMap.setBounds(this.getLocalBounds()
      .removeFromBottom(miniMapSize)
      .removeFromRight(miniMapSize));

    this.repaint();
  }

  public render(g: CanvasRenderingContext2D): void {
  }

  private findSuitablePinNearby(position: Point, sourcePin: Pin): Pin | null {
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

  private createConnection(first: Pin, second: Pin): void {
    if (first instanceof OutletPin) {
      this._addConnectionSubject.next({
        sourceNode: first.parentNode.id,
        sourcePinId: first.id,
        targetNode: second.parentNode.id,
        targetPinId: second.id,
      });
    } else {
      this._addConnectionSubject.next({
        targetNode: first.parentNode.id,
        targetPinId: first.id,
        sourceNode: second.parentNode.id,
        sourcePinId: second.id,
      });
    }
  }

  private findNode(id: number): GraphNode | null {
    return this._nodes.array.find(n => n.id === id);
  }
}
