import { Component } from '../../canvas/BaseComponent';
import { ViewportArea } from './ViewportArea';

export class GraphRoot extends Component {
  private readonly _viewportArea: ViewportArea;

  constructor() {
    super();

    this._viewportArea = new ViewportArea();
    this.addAndMakeVisible(this._viewportArea);
  }

  public resized(): void {
    const bounds = this.getLocalBounds();
    this._viewportArea.setBounds(bounds);

    this.repaint();
  }

  public render(g: CanvasRenderingContext2D): void {
  }
}
