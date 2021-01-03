import { defaultTheme } from '../../../style.constants';
import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { Points, Rectangle } from '../../canvas/Rectangle';
import { GraphRoot } from './GraphRoot';

export class MiniMap extends Component {
  private _previewCanvas: HTMLCanvasElement;

  private readonly _extensionAmount: number = 20;
  private _previewRatio: number;
  private _outerBounds: Rectangle;

  constructor(public readonly graphRoot: GraphRoot) {
    super();

    this.graphRoot.viewport.viewPositionChanged$
      .subscribe(() => this.updatePreview());
  }

  public get previewBounds(): Rectangle {
    const marginToCorner = 7;
    return this.getLocalBounds().withTrimmedRight(marginToCorner)
      .withTrimmedBottom(marginToCorner)
      .reduced(2);
  }

  public updatePreview(): void {
    if (this._previewCanvas != null) {
      const g = this._previewCanvas.getContext('2d');
      g.fillStyle = defaultTheme.bgSecondary;
      g.fillRect(0, 0, this._previewCanvas.width, this._previewCanvas.height);

      const previewBounds = this.previewBounds;
      const nodesBounds = this.graphRoot.nodes.array.map((n) => n.getBounds());
      const outerBounds = Rectangle.findOuterBounds(nodesBounds);
      const extended = outerBounds.extended(this._extensionAmount);

      // We cache these results for faster mouse interaction
      this._previewRatio = Math.min(
        previewBounds.width / extended.width,
        previewBounds.height / extended.height,
      );
      this._outerBounds = outerBounds;

      this.drawViewport(g);
      this.drawConnections(g);
      this.drawNodes(g);

      this.repaint();
    }
  }

  public mousePressed(event: ComponentMouseEvent): void {
    super.mousePressed(event);
    this.moveViewTowardMouse(event);
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    super.mouseDragged(event);
    this.moveViewTowardMouse(event);
  }

  protected resized(): void {
    const previousBounds = this.previewBounds;
    this._previewCanvas = Component.createOffscreenCanvas(
      previousBounds.width,
      previousBounds.height);

    this.updatePreview();
  }

  protected render(g: CanvasRenderingContext2D): void {
    const mapBounds = this.previewBounds;
    this.drawBox(g, mapBounds);

    if (this._previewCanvas != null) {
      g.drawImage(this._previewCanvas, mapBounds.x, mapBounds.y);
    }
  }

  private drawBox(g: CanvasRenderingContext2D, mapBounds: Rectangle): void {
    g.fillStyle = defaultTheme.bgSecondary;
    g.strokeStyle = defaultTheme.border;
    g.shadowOffsetX = 4;
    g.shadowOffsetY = 4;
    g.shadowBlur = 8;
    g.shadowColor = '#00000020';
    g.fillRect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
    g.shadowColor = '#00000000';
    g.strokeRect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
  }

  private drawViewport(g: CanvasRenderingContext2D): void {
    const viewportBounds = this.graphRoot.viewport.getViewBounds();
    const scaled = viewportBounds.scaled(this._previewRatio).translated({
      x: -(this._outerBounds.x - this._extensionAmount / 2) * this._previewRatio,
      y: -(this._outerBounds.y - this._extensionAmount / 2) * this._previewRatio,
    });

    g.strokeStyle = defaultTheme.border;
    g.fillStyle = defaultTheme.bgPrimary;
    g.lineWidth = 2;
    g.fillRect(scaled.x, scaled.y, scaled.width, scaled.height);
    g.strokeRect(scaled.x, scaled.y, scaled.width, scaled.height);
  }

  private drawNodes(g: CanvasRenderingContext2D): void {
    g.fillStyle = defaultTheme.bgSecondary;

    this.graphRoot.nodes.array.forEach(n => {
      const b = n.getBounds().scaled(this._previewRatio).translated({
        x: -(this._outerBounds.x - this._extensionAmount / 2) * this._previewRatio,
        y: -(this._outerBounds.y - this._extensionAmount / 2) * this._previewRatio,
      });

      g.strokeStyle = n.selected ? defaultTheme.selectedBorder : defaultTheme.border;

      g.fillRect(b.x, b.y, b.width, b.height);
      g.strokeRect(b.x, b.y, b.width, b.height);
    });
  }

  private drawConnections(g: CanvasRenderingContext2D): void {
    g.lineWidth = 1;

    this.graphRoot.connections.array.forEach((connection) => {
      // /!\ Tedious calculations ahead...
      const viewOffset = this.graphRoot.viewport.getViewOffset();
      const firstPos = connection.getFirstPosition();
      const secondPos = connection.getSecondPosition();
      const previewOffset = Points.add(this._outerBounds, {
        x: -this._extensionAmount / 2,
        y: -this._extensionAmount / 2,
      });

      const start = {
        x: (firstPos.x - viewOffset.x - previewOffset.x) * this._previewRatio,
        y: (firstPos.y - viewOffset.y - previewOffset.y) * this._previewRatio,
      };
      const end = {
        x: (secondPos.x - viewOffset.x - previewOffset.x) * this._previewRatio,
        y: (secondPos.y - viewOffset.y - previewOffset.y) * this._previewRatio,
      };

      g.strokeStyle = connection.selected ? defaultTheme.selectedBorder : defaultTheme.border;

      g.beginPath();
      g.moveTo(start.x, start.y);
      g.lineTo(end.x, end.y);
      g.stroke();
    });
  }

  private moveViewTowardMouse(event: ComponentMouseEvent): void {
    const localMousePos = {
      x: event.position.x - this.getBounds().topLeft.x,
      y: event.position.y - this.getBounds().topLeft.y,
    };

    this.graphRoot.viewport.centerViewAt({
      x: (localMousePos.x / this._previewRatio) + (this._outerBounds.x - this._extensionAmount / 2),
      y: (localMousePos.y / this._previewRatio) + (this._outerBounds.y - this._extensionAmount / 2),
    });
  }
}
