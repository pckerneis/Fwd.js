import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { IRectangle, Point, Rectangle } from '../../canvas/Rectangle';
import { LassoSelector } from '../../canvas/shared/LassoSelector';
import { MAX_PITCH, SequencerDisplayModel } from '../note-sequencer';
import { Note, NoteGridComponent } from './NoteGridComponent';
import { squaredDistance } from './RenderHelpers';

export class VelocityTrack extends Component {

  private readonly handleRadius: number = 3;

  private _draggingHandle: boolean;
  private _mouseDownResult: boolean;
  private _initialVelocity: number;

  private readonly lasso: LassoSelector;

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();

    this.lasso = new LassoSelector(this, this.grid.selectedSet, this.model.colors);

    this.lasso.findAllElementsInLasso = (lassoBounds) => this.grid.notes
      .filter((note) => Rectangle.intersect(this.getNoteBounds(note), lassoBounds))
      .map(n => n.id);
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    this._draggingHandle = false;

    const handle = this.findHandleAt(local);

    if (handle == null) {
      if (! event.modifiers.shift) {
        this.grid.selectedSet.deselectAll();
      }

      this.lasso.beginLasso(event);
      this._mouseDownResult = true;

      return;
    }

    this._initialVelocity = handle.velocity;

    this.grid.selectedSet.items.forEach((id) => {
      const note = this.grid.notes.find(n => n.id === id);
      if (note != null) {
        note.initialVelocity = note.velocity;
      }
    });

    // handle is actually a reference to the note
    this.grid.moveNoteToFront(handle);
    this._draggingHandle = true;

    this._mouseDownResult = this.grid.selectedSet.addToSelectionMouseDown(handle.id, event.modifiers.shift);

    this.repaintParent();
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    event.nativeEvent.preventDefault();
    event.nativeEvent.stopPropagation();

    if (! event.wasDragged)
      return;

    if (this._draggingHandle) {
      this.dragSelectedHandles(event);
    } else {
      this.lasso.dragLasso(event);
    }

    this.repaintParent();
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    this.lasso.endLasso();

    this.grid.selectedSet.addToSelectionMouseUp(event.wasDragged, event.modifiers.shift, this._mouseDownResult);

    this.grid.notes.forEach((note) => {
      note.initialVelocity = note.velocity;
    });

    this.repaintParent();
  }

  protected render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    const start = this.model.visibleTimeRange.start;
    const end = this.model.visibleTimeRange.end;
    const sixteenth = this.grid.getSixteenthWidth();

    this.drawHorizontalBackground(g, sixteenth, start, end);

    this.lasso.drawLasso(g);

    this.drawVelocityHandles(g);

    this.renderFlags(g);
  }

  protected resized(): void {
  }

  private drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number,
                                   start: number, end: number): void {
    const incr = this.grid.getTimeIncrement();

    if (incr <= 0) {
      return;
    }

    this.model.theme.drawTimeBackground(g, this.height, sixteenth, incr, start, end,
      this.model.signature, this.model.colors);
  }

  private drawVelocityHandles(g: CanvasRenderingContext2D): void {
    const vScale = this.height / MAX_PITCH;
    const hScale = this.grid.getSixteenthWidth();

    for (const note of this.grid.notes) {
      const x = this.grid.getPositionForTime(note.time);
      const w = Math.max(0, hScale * (note.tempDuration || note.duration));

      if (x + w < -5 || x > this.width + 5)
        continue;

      this.model.theme.drawVelocityHandle(g, x, note, this.width, this.height, vScale, hScale,
        this.handleRadius, this.model.colors);
    }
  }

  private dragSelectedHandles(event: ComponentMouseEvent): void {
    const vScale = this.height / MAX_PITCH;
    const dragOffset = event.position.y - event.positionAtMouseDown.y;

    const scaled = dragOffset / vScale;

    for (const selected of this.grid.selectedNotes) {
      selected.velocity = selected.initialVelocity - scaled;
      selected.velocity = Math.min(MAX_PITCH, Math.max(1, selected.velocity));
    }
  }

  private findHandleAt(pos: Point): Note | null {
    let vScale = this.height / MAX_PITCH;
    const squaredHitDistance = 64;

    // We need to iterate from end to start to have front most notes first
    for (const note of this.grid.notes) {
      const x = this.grid.getPositionForTime(note.time);
      const y = this.height - note.velocity * vScale;

      if (squaredDistance(pos.x, pos.y, x, y) < squaredHitDistance)
        return note;
    }

    return null;
  }

  private renderFlags(g: CanvasRenderingContext2D): void {
    this.grid.flags.forEach((flag) => {
      const pos = this.grid.getPositionForTime(flag.time);
      g.fillStyle = flag.color;
      g.fillRect(pos, 0, 1, this.height);
    });
  }

  private getNoteBounds(note: Note): IRectangle {
    const vScale = this.height / MAX_PITCH;
    return {
      x: this.grid.getPositionForTime(note.time) - this.handleRadius,
      y: this.height - (note.velocity * vScale) - this.handleRadius,
      width: this.handleRadius * 2,
      height: this.handleRadius * 2,
    };
  }
}
