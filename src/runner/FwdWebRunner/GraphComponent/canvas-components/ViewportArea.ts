import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { Point, Rectangle } from '../../canvas/Rectangle';
import { drawConnection } from './Connection';
import { GraphRoot } from './GraphRoot';

export class ViewportArea extends Component {

  private _backgroundColor: string = 'white';
  private _mouseDownResult: boolean;

  constructor(public readonly graphRoot: GraphRoot) {
    super();
  }

  public getViewBounds(): Rectangle {
    const offset = this.getViewOffset();
    return this.getLocalBounds().translated({x: -offset.x, y: -offset.y});
  }

  public centerViewAt(pos: Point): void {
    this.setViewOffset({
      x: -pos.x + this.width / 2,
      y: -pos.y + this.height / 2,
    });

    this.repaint();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    super.mousePressed(event);

    for (const connection of this.graphRoot.connections.array) {
      if (connection.hitTest(event.position)) {
        this._mouseDownResult = this.graphRoot.selection
          .addToSelectionMouseDown(connection, event.modifiers.shift);
        this.repaint();
        return;
      }
    }

    this.graphRoot.selection.deselectAll();
    this.graphRoot.repaint();
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    super.mouseReleased(event);
    this.graphRoot.selection.addToSelectionMouseUp(event.wasDragged,
      event.modifiers.shift, this._mouseDownResult);
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this._backgroundColor;
    g.fillRect(0, 0, this.width, this.height);

    if (this.graphRoot.hasTemporaryConnection) {
      const sourcePin = this.graphRoot.temporaryConnection.sourcePin;
      const startPos = sourcePin.getBoundsInGraph().translated(this.getViewOffset()).center;
      const endPos = this.graphRoot.temporaryConnection.endPosition;
      drawConnection(g, startPos, endPos, true);
    }

    this.graphRoot.connections.array.forEach(connection => {
      connection.draw(g);
    });
  }

  protected resized(): void {
  }
}
