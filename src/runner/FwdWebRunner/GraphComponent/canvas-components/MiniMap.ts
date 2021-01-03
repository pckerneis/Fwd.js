import { defaultTheme } from '../../../style.constants';
import { Component } from '../../canvas/BaseComponent';
import { Rectangle } from '../../canvas/Rectangle';

export class MiniMap extends Component {

  private previewCanvas: HTMLCanvasElement;

  constructor() {
    super();
  }

  public get previewBounds(): Rectangle {
    const marginToCorner = 7;
    return this.getLocalBounds().withTrimmedRight(marginToCorner)
      .withTrimmedBottom(marginToCorner);
  }

  public updatePreview(): void {
    if (this.previewCanvas != null) {
      const g = this.previewCanvas.getContext('2d');

      // Actual rendering code here
    }
  }

  protected resized(): void {
    this.previewCanvas = Component.createOffscreenCanvas(
      Math.ceil(this.width),
      Math.ceil(this.height));

    this.updatePreview();
  }

  protected render(g: CanvasRenderingContext2D): void {
    const mapBounds = this.previewBounds;
    this.drawBox(g, mapBounds);

    if (this.previewCanvas != null) {
      g.drawImage(this.previewCanvas, mapBounds.x, mapBounds.y);
    }
  }

  private drawBox(g: CanvasRenderingContext2D, mapBounds: Rectangle): void {
    g.fillStyle = defaultTheme.bgPrimary;
    g.strokeStyle = defaultTheme.border;
    g.shadowOffsetX = 4;
    g.shadowOffsetY = 4;
    g.shadowBlur = 8;
    g.shadowColor = '#00000020';
    g.fillRect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
    g.shadowColor = '#00000000';
    g.strokeRect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
  }
}
