import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentMouseEvent, ComponentPosition } from '../../canvas/BaseComponent';
import { squaredDistance } from '../../NoteSequencer/canvas-components/RenderHelpers';
import { GraphNode } from './GraphNode';
import { Pin } from './Pin';
import { ViewportArea } from './ViewportArea';

interface TemporaryConnection {
  endPosition: ComponentPosition;
  readonly sourcePin: Pin;
}

class Connection {
  constructor(public readonly first: Pin, public readonly second: Pin) {
  }
}

export class GraphRoot extends Component {
  private readonly _viewportArea: ViewportArea;

  private _temporaryConnection: TemporaryConnection = null;

  private readonly _nodes: ArrayList<GraphNode> = new ArrayList<GraphNode>();
  private readonly _connections: ArrayList<Connection> = new ArrayList<Connection>();

  constructor() {
    super();

    this._viewportArea = new ViewportArea(this);
    this.addAndMakeVisible(this._viewportArea);
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
        this.addConnection(this._temporaryConnection.sourcePin, suitablePin);
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
      this._nodes.remove(node);
      this._viewportArea.removeChild(node);
      this.resized();
    }
  }

  public arePinsConnected(first: Pin, second: Pin): Boolean {
    for (let connection of this._connections.array) {
      if ((connection.first === first && connection.second === second)
        || (connection.second === first && connection.first === second)) {
        return true;
      }
    }

    return false;
  }

  public addConnection(first: Pin, second: Pin): void {
    if (! this.arePinsConnected(first, second)) {
      this._connections.add(new Connection(first, second));
      this.repaint();
    }
  }

  public removeConnection(first: Pin, second: Pin): void {
    this._connections.remove(this.findConnection(first, second));
    this.repaint();
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

  private findConnection(first: Pin, second: Pin): Connection {
    return this._connections.array.find(c => c.first === first && c.second === second);
  }
}
