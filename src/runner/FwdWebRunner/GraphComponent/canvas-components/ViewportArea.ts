import { Component } from '../../canvas/BaseComponent';

export class ViewportArea extends Component {
  constructor() {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = 'red';
    g.fillRect(0, 0, this.width, this.height);
  }

  protected resized(): void {
  }

}
