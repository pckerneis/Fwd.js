import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentMouseEvent, ComponentPosition } from '../../canvas/BaseComponent';
import { squaredDistance } from '../../NoteSequencer/canvas-components/RenderHelpers';
import { GraphNode, InitNode, MidiClipNode } from './GraphNode';
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


    const node1 = new InitNode(this);
    const node2 = new MidiClipNode(this);
    node2.label = 'node 2 with long name that will overflow for sure';
    this.addNode(node1);
    this.addNode(node2);

    node2.addInlet();
    node2.addInlet();
  }

  public get temporaryConnection(): TemporaryConnection {
    return this._temporaryConnection;
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

  private addConnection(first: Pin, second: Pin): void {
    this._connections.add(new Connection(first, second));
  }
}
