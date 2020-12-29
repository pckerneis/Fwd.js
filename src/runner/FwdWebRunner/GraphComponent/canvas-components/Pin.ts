import { Component } from '../../canvas/BaseComponent';

abstract class Pin extends Component {

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
  protected render(g: CanvasRenderingContext2D): void {
    this.drawPin(g, 1, this.height / 2, 4);
  }
}

export class OutletPin extends Pin {
  protected render(g: CanvasRenderingContext2D): void {
    this.drawPin(g, this.width - 1, this.height / 2, 4);
  }
}
