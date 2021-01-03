import { Observable, Subject } from 'rxjs';
import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { Point, Points, Rectangle } from '../../canvas/Rectangle';
import { squaredDistance } from '../../NoteSequencer/canvas-components/RenderHelpers';
import { drawConnection } from './Connection';
import { GraphRoot } from './GraphRoot';

export class ViewportArea extends Component {

  public readonly viewPositionChanged$: Observable<void>;

  private _backgroundColor: string = 'white';
  private _mouseDownResult: boolean;
  private _viewOffsetAtMouseDown: Point = Points.origin();
  private _currentTarget: Point = Points.origin();
  private _latestOffset: Point = Points.origin();
  private _viewPositionChanged$: Subject<void> = new Subject<void>();

  constructor(public readonly graphRoot: GraphRoot) {
    super();

    this.viewPositionChanged$ = this._viewPositionChanged$.asObservable();
  }

  public getViewBounds(): Rectangle {
    const offset = this.getViewOffset();
    return this.getLocalBounds().translated({x: -offset.x, y: -offset.y});
  }

  public centerViewAt(pos: Point): void {
    this.setTargetOffset({
      x: -pos.x + this.width / 2,
      y: -pos.y + this.height / 2,
    });
  }

  public setTargetOffset(pos: Point): void {
    this._currentTarget = pos;
    this.animateViewScroll();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    super.mousePressed(event);
    this._viewOffsetAtMouseDown = this.graphRoot.viewport.getViewOffset();

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

  public mouseDragged(event: ComponentMouseEvent): void {
    super.mouseDragged(event);

    if (this.graphRoot.selection.isEmpty()) {
      this.graphRoot.viewport.setTargetOffset({
        x: this._viewOffsetAtMouseDown.x + event.getDragOffset().x,
        y: this._viewOffsetAtMouseDown.y + event.getDragOffset().y,
      });
    }
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

  private animateViewScroll(): void {
    const targetPosition = Points.lerp(
      this._latestOffset,
      this._currentTarget,
      0.2);

    this.setViewOffset(targetPosition);

    const reachedTarget = squaredDistance(
      targetPosition.x, targetPosition.y,
      this._latestOffset.x, this._latestOffset.y) < 1;

    this._latestOffset = targetPosition;

    if (!reachedTarget) {
      requestAnimationFrame(() => this.animateViewScroll());
    }
    
    this._viewPositionChanged$.next();

    this.repaint();
  }
}
