import { Component, ComponentPosition } from '../../canvas/BaseComponent';
import { GraphRoot } from './GraphRoot';

export class ViewportArea extends Component {

  private _backgroundColor: string = 'white';

  constructor(public readonly graphRoot: GraphRoot) {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this._backgroundColor;
    g.fillRect(0, 0, this.width, this.height);

    if (this.graphRoot.hasTemporaryConnection) {
      const sourcePin = this.graphRoot.temporaryConnection.sourcePin;
      const startPos = sourcePin.getBoundsInGraph().center;
      const endPos = this.graphRoot.temporaryConnection.endPosition;
      drawConnection(g, startPos, endPos);
    }

    this.graphRoot.connections.array.forEach(connection => {
      const firstPin = this.graphRoot.findPin(connection.first);
      const secondPin = this.graphRoot.findPin(connection.second);

      if (firstPin != null && secondPin != null) {
        const startPos = firstPin.getBoundsInGraph().center;
        const endPos = secondPin.getBoundsInGraph().center;
        drawConnection(g, startPos, endPos);
      }
    });
  }

  protected resized(): void {
  }

}

function drawConnection(g: CanvasRenderingContext2D,
                        startPos: ComponentPosition,
                        endPos: ComponentPosition): void {
  g.strokeStyle = 'black';
  g.lineWidth = 2;

  g.beginPath();
  g.moveTo(startPos.x, startPos.y);
  g.lineTo(endPos.x, endPos.y);
  g.stroke();
}
