import { Component, ComponentBounds, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { GraphNode } from './GraphNode';
import { GraphRoot } from './GraphRoot';


export abstract class Pin extends Component {

  constructor(public readonly parentNode: GraphNode,
              public readonly parentGraph: GraphRoot) {
    super();
  }

  public abstract canConnect(other: Pin): boolean;

  public mouseDragged(event: ComponentMouseEvent): void {
    if (! this.parentGraph.hasTemporaryConnection) {
      this.parentGraph.initiateTemporaryConnection(this, event);
    }

    this.parentGraph.temporaryConnectionDragged(event);
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    this.parentGraph.temporaryConnectionReleased(event);
  }

  public getBoundsInGraph(): ComponentBounds {
    const nodePosition = this.parentNode.getPosition();
    return this.getBounds().translated(nodePosition);
  }

  protected resized(): void {
  }

  protected drawPin(g: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
    g.fillStyle = 'lightgrey';
    g.strokeStyle = 'grey';
    g.beginPath();
    g.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    g.stroke();
    g.fill();
  }
}

export class InletPin extends Pin {
  public canConnect(other: Pin): boolean {
    if (other instanceof OutletPin) {
      return this.parentNode.canConnect(this, other);
    }

    return false;
  }

  protected render(g: CanvasRenderingContext2D): void {
    this.drawPin(g, 1, this.height / 2, 4);
  }
}

export class OutletPin extends Pin {
  public canConnect(other: Pin): boolean {
    if (other instanceof InletPin) {
      return this.parentNode.canConnect(other, this);
    }

    return false;
  }

  protected render(g: CanvasRenderingContext2D): void {
    this.drawPin(g, this.width - 1, this.height / 2, 4);
  }
}
