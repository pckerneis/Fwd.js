import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { Range, SequencerDisplayModel } from '../note-sequencer';
import { clamp } from '../utils';
import { FlagDirection, NoteGridComponent } from './NoteGridComponent';

export class TimeRuler extends Component {
  private timeAtMouseDown: number;
  private rangeAtMouseDown: Range;
  private zoomAtMouseDown: number;

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    this.timeAtMouseDown = this.grid.getTimeAt(event.position.x);
    this.rangeAtMouseDown = {...this.model.visibleTimeRange};
    this.zoomAtMouseDown = (this.model.maxTimeRange.end - this.model.maxTimeRange.start) /
      (this.model.visibleTimeRange.end - this.model.visibleTimeRange.start);
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    this.model.visibleTimeRange.start = 0;
    this.model.visibleTimeRange.end = this.model.maxTimeRange.end;
    this.getParentComponent().repaint();
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    event.nativeEvent.stopPropagation();
    event.nativeEvent.preventDefault();

    const dragSensitivity = -0.0015;
    const minimalRange = 1;

    const dragOffset = event.positionAtMouseDown.y - event.position.y;
    const toAdd = (this.model.maxTimeRange.end - this.model.maxTimeRange.start) * dragOffset * dragSensitivity;
    const amountToAdd = toAdd / 2;

    let newStart = this.rangeAtMouseDown.start + amountToAdd;
    let newEnd = this.rangeAtMouseDown.end - amountToAdd;

    // Compute the quantity to remove to ensure the resulting range is above the minimal range
    const excess = Math.max(0, minimalRange - (newEnd - newStart));
    newStart -= excess * 0.5;
    newEnd += excess * 0.5;

    // Pre-apply the new range
    this.model.visibleTimeRange.start = Math.max(this.model.maxTimeRange.start, newStart);
    this.model.visibleTimeRange.end = Math.min(this.model.maxTimeRange.end, newEnd);

    // Compute the offset to the anchor under the mouse
    let offset = this.timeAtMouseDown - this.grid.getTimeAt(event.position.x);

    // Constraint this offset to stay in the maximal range
    const distanceToLeft = this.model.maxTimeRange.start - this.model.visibleTimeRange.start;
    const distanceToRight = this.model.visibleTimeRange.end - this.model.maxTimeRange.end;
    offset = clamp(offset, distanceToLeft, -distanceToRight);

    // Apply the constrained offset
    this.model.visibleTimeRange.start = Math.max(this.model.maxTimeRange.start, newStart + offset);
    this.model.visibleTimeRange.end = Math.min(this.model.maxTimeRange.end, newEnd + offset);

    this.getParentComponent().repaint();
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    const start = this.model.visibleTimeRange.start;
    const end = this.model.visibleTimeRange.end;
    const sixteenth = this.grid.getSixteenthWidth();

    if (sixteenth < 0.0001 || sixteenth === Infinity) {
      // escape overly intensive calculation or even potential infinite loop
      return;
    }

    const minLabelSpacing = 50;
    const minGraduationSpacing = 5;

    let ratio = 1;

    while (sixteenth * ratio < minLabelSpacing)
      ratio *= 2;

    let incr = 1;

    if (sixteenth * incr < minGraduationSpacing) {
      while (sixteenth * incr < minGraduationSpacing)
        incr *= 2;
    } else {
      while (sixteenth * incr * 0.5 > minGraduationSpacing)
        incr *= .5;
    }

    for (let i = 0; i < Math.ceil(end); i += incr) {
      const x = (i - start) * sixteenth;

      if (x < 0)
        continue;

      const gradH = i % (incr * 4) == 0 ? 0.4 : 0.12;

      g.fillStyle = this.model.colors.strokeLight;
      g.fillRect(x, bounds.height * (1 - gradH), 1, bounds.height * gradH);

      if (i % ratio == 0) {
        g.rect(x + 1, bounds.height * (1 - gradH), 1, 1);

        g.fillStyle = this.model.colors.text;
        const text = this.grid.getStringForTime(i, true);
        g.fillText(text, x + 4, bounds.height - 5, minLabelSpacing);
      }
    }

    // Bottom border
    g.fillStyle = this.model.colors.strokeDark;
    g.fillRect(0, bounds.height - 1, bounds.width, 1);

    this.renderFlags(g);
  }

  private renderFlags(g: CanvasRenderingContext2D): void {
    this.grid.flags.forEach((flag) => {
      const left = flag.direction === FlagDirection.left;
      const pos = this.grid.getPositionForTime(flag.time);
      g.fillStyle = flag.color;

      g.fillRect(pos, 0, 1, this.height);

      const arrowWidth =  left ? -10 : 10;
      const arrowHeight = 12;
      g.beginPath();
      g.moveTo(pos, 0);
      g.lineTo(pos + arrowWidth, arrowHeight / 2);
      g.lineTo(pos, arrowHeight);
      g.fill();

      const textPosition = pos + arrowWidth + (left ? -2 : 2);
      g.textBaseline = 'hanging';
      g.textAlign = flag.direction === FlagDirection.left ? 'right' : 'left';
      g.fillText(flag.label, textPosition, 2, 100);
    });
  }
}
