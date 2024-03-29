import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { IRectangle, Point, Rectangle } from '../../canvas/Rectangle';
import { LassoSelector } from '../../canvas/shared/LassoSelector';
import { SelectedItemSet } from '../../canvas/shared/SelectedItemSet';
import { SequenceGenerator } from '../../services/sequence-generator';
import { MAX_PITCH, MAX_VELOCITY, MIN_SEMI_H, NoteSequencer, SequencerDisplayModel } from '../note-sequencer'

export interface Note {
  id: number;
  time: number,
  pitch: number,
  duration: number,
  velocity: number,

  tempDuration?: number,
  hidden?: boolean,
  selected: boolean,

  initialStart: number;
  initialVelocity: number;
}

export enum FlagDirection {
  left,
  right,
}

export interface Flag {
  id: number;
  time: number;
  label: string;
  selected: boolean;
  color: string;
  direction: FlagDirection;
}

interface NotePosition {
  time: number,
  pitch: number,
}

type DragAction = 'V_RIGHT' | 'MOVE_NOTE' | 'RIGHT' | 'LEFT' | 'NONE';

export class NoteGridComponent extends Component {

  // TODO: move into model or utility
  public readonly adaptiveLabels: string[] = ['XL', 'X', 'M', 'S', 'XS'];
  public readonly adaptiveRatios: number[] = [1, .5, .25, .1, .05];
  public adaptiveIndex: number = 3;
  public fixedIncrements: number[] = [128, 64, 32, 16, 8, 4, 2, 1, 0.5];
  public fixedIndex: number = 5;

  private _notes: Note[] = [];
  private _flags: Flag[] = [];
  private readonly _selectedSet: SelectedItemSet;
  private readonly _lasso: LassoSelector;

  // Mouse interaction state
  private _dragAction: DragAction;
  private _mouseDownResult: boolean = false;
  private _currentVelocity: number = MAX_VELOCITY;
  private _draggedItem?: Note;
  private _initialDuration?: number;
  private _initialStart?: number;
  private _initialVelocity?: number;
  private _initialPosition?: NotePosition;
  private _minStartOffset?: number;
  private _maxDurationOffset?: number;
  private _minDragOffset?: NotePosition;
  private _maxDragOffset?: NotePosition;
  private readonly _idSequence: SequenceGenerator = new SequenceGenerator();

  constructor(private readonly model: SequencerDisplayModel,
              public readonly noteSequencer: NoteSequencer) {
    super();

    this._selectedSet = new SelectedItemSet();

    this._lasso = new LassoSelector(this, this._selectedSet, this.model.colors);

    this._lasso.findAllElementsInLasso = (lassoBounds: Rectangle) => this._notes
      .filter((note) => Rectangle.intersect(this.getNoteBounds(note), lassoBounds))
      .map(n => n.id);

    this.selectedSet.selection$.subscribe((selection) => {
      this._notes.forEach(n => n.selected = selection.includes(n.id));
      this.repaint();
    });
  }

  public get notes(): Note[] {
    return this._notes;
  }

  public get selectedNotes(): Note[] {
    return this._selectedSet.items
      .map(id => this.notes.find(n => n.id === id))
      .filter(note => !! note) as Note[];
  };

  public set notes(newNotes: Note[]) {
    this._notes = newNotes;
    this.repaintParent();
  }

  public get flags(): Flag[] {
    return this._flags;
  };

  public set flags(newFlags: Flag[]) {
    this._flags = newFlags;
    this.repaintParent();
  }

  public get selectedSet(): SelectedItemSet {
    return this._selectedSet;
  }

  public render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    const hMin = this.model.visibleTimeRange.start;
    const hMax = this.model.visibleTimeRange.end;
    const sixteenth = this.getSixteenthWidth();

    this.drawHorizontalBackground(g, sixteenth, hMin, hMax);

    // Vertical
    const start = this.model.verticalRange.start;
    const end = this.model.verticalRange.end;
    const semiHeight = this.getSemitoneHeight();

    if (semiHeight > MIN_SEMI_H) {
      this.model.theme.drawSemiTonePattern(g, this.width, this.height, start, end, semiHeight, this.model.colors);
    } else {
      this.model.theme.drawOctaveLines(g, this.width, this.height, start, end, semiHeight, this.model.colors);
    }

    this._lasso.drawLasso(g);

    this.drawNotes(g, semiHeight, sixteenth);
    this.renderFlags(g);
  }

  public resized(): void {
    this.repaint();
  }

  //===============================================================================
  // Note management
  public removeNote(id: number, repaint: boolean = true): void {
    this._selectedSet.removeFromSelection(id);
    this._notes = this._notes.filter(n => n.id !== id);
    this.changed();

    if (repaint) {
      this.repaintParent();
    }
  }

  public moveNoteToFront(note: Note): void {
    const idx = this._notes.indexOf(note);

    if (idx >= 0) {
      this._notes.splice(idx, 1);
      this._notes.push(note);
      this.repaintParent();
    }
  }

  public deleteSelection(): void {
    const selected = this._selectedSet.items;

    for (let i = selected.length; --i >= 0;)
      this.removeNote(selected[i], false);

    this.repaintParent();
  }

  //===============================================================================
  // Flag management
  public addFlag(flag: Flag): void {
    this._flags.push(flag);

    this.repaintParent();
  }

  //===============================================================================

  public getSixteenthWidth(): number {
    return this.width / (this.model.visibleTimeRange.end - this.model.visibleTimeRange.start);
  }

  public getTimeAt(pos: number): number {
    const start = this.model.visibleTimeRange.start;
    const sixteenth = this.getSixteenthWidth();
    const x = this.getPosition().x;

    pos -= x;                   // Local pos
    pos += start * sixteenth;    // visible area offset

    return (pos / sixteenth);
  }

  public getPitchAt(pos: number): number {
    const start = this.model.verticalRange.start;
    const semi = this.getSemitoneHeight();
    const y = this.getPosition().y;

    pos -= y;                             // Local position
    pos -= start * semi;                  // offset for visible area
    pos = this.height - pos;              // Inversion
    pos += semi * 0.5;                    // offset to have the 'note' centred
    return Math.round(pos / semi);     // Scaling
  }

  public getPositionForTime(time: number): number {
    const start = this.model.visibleTimeRange.start;
    const end = this.model.visibleTimeRange.end;
    const vRange = end - start;
    const sixteenth = this.width / vRange;

    return (time - start) * sixteenth;
  }

  public getPositionForPitch(pitch: number): number {
    const semiHeight = this.getSemitoneHeight();
    return this.height - (pitch - this.model.verticalRange.start) * semiHeight;
  }

  public getSemitoneHeight(): number {
    return this.height / (this.model.verticalRange.end - this.model.verticalRange.start);
  }

  //===============================================================================
  // Mouse event handlers

  public doublePressed(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();

    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    const existingNote = this.findNoteAt(local);

    if (existingNote != null) {
      this.removeNote(existingNote.id);
      return;
    }

    const t = this.snapToGrid(this.getTimeAt(event.position.x));
    const p = Math.round(this.getPitchAt(event.position.y));
    const d = this.getTimeIncrement() || 0;

    const newNote: Note = {
      id: this._idSequence.next(),
      time: t,
      pitch: p,
      duration: d,
      velocity: this._currentVelocity,
      hidden: false,
      selected: true,
      tempDuration: 0,
      initialStart: t,
      initialVelocity: this._currentVelocity,
    };

    this._notes.push(newNote);
    this._selectedSet.setUniqueSelection(newNote.id);

    this.removeOverlaps(true);

    // We start dragging the end point of this note and its velocity
    this._dragAction = 'V_RIGHT';
    this._draggedItem = newNote;

    this.repaintParent();

    this.mouseCursor = 'w-resize';
  }

  public mouseMoved(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();

    super.mouseMoved(event);

    if (event.isDragging)
      return;

    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    const existingNote = this.findNoteAt(local);

    if (existingNote == null) {
      this.mouseCursor = 'default';
      return;
    }

    const action = this.getDragActionForNoteAt(local, existingNote);

    if (action == 'MOVE_NOTE') {
      this.mouseCursor = 'move';
    } else if (action == 'LEFT') {
      this.mouseCursor = 'w-resize';
    } else if (action == 'RIGHT') {
      this.mouseCursor = 'e-resize';
    } else {
      this.mouseCursor = 'default';
    }
  }

  public mousePressed(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();

    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    const existingNote = this.findNoteAt(local);

    if (existingNote == null) {
      if (! event.modifiers.shift) {
        this._selectedSet.deselectAll();
      }

      this._lasso.beginLasso(event);

      this._mouseDownResult = true;

      return;
    }

    this._mouseDownResult = this._selectedSet.addToSelectionMouseDown(existingNote.id, event.modifiers.shift);
    this._dragAction = this.getDragActionForNoteAt(local, existingNote);
    this.setMouseCursor(this._dragAction);

    this._draggedItem = existingNote;
    this.moveNoteToFront(existingNote);
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();

    const shouldNotifyChanges = this._dragAction != 'NONE';

    this._dragAction = 'NONE';
    this.setMouseCursor(this._dragAction);

    this._initialPosition = undefined;
    this._initialDuration = undefined;
    this._initialStart = undefined;
    this._initialVelocity = undefined;

    this._lasso.endLasso();

    // in case a drag would have caused negative durations
    for (const selected of this._selectedSet.items) {
      const note = this.notes.find(n => n.id === selected);

      if (note != null) {
        note.duration = Math.max(0, note.duration);
      }
    }

    this._selectedSet.addToSelectionMouseUp(event.wasDragged, event.modifiers.shift, this._mouseDownResult);

    this.removeOverlaps(true);

    this._notes.forEach((note) => {
      note.initialVelocity = note.velocity;
    });

    this._draggedItem = undefined;

    if (shouldNotifyChanges) {
      this.changed();
    }
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();

    if (this._dragAction == 'NONE') {
      this._lasso.dragLasso(event);
    }

    if (! event.wasDragged || this._dragAction == 'NONE') {
      this.repaintParent();
      return;
    }

    if (this._dragAction == 'MOVE_NOTE') {
      this.moveSelection(event);
    } else if (this._dragAction == 'RIGHT' || this._dragAction == 'V_RIGHT') {
      this.dragEndPoints(event);
    } else if (this._dragAction == 'LEFT') {
      this.dragStartPoints(event);
    }

    if (this._dragAction == 'V_RIGHT') {
      this.dragVelocity(event);
    }

    this.removeOverlaps(false);

    this.repaintParent();
  }

  //===============================================================================

  public getTimeAsMBS(t: number): number[] {
    const denominator = (16 / this.model.signature.lower);
    let b = Math.floor(t / denominator);

    const s = t - (b * denominator);
    const m = Math.floor(b / this.model.signature.upper);
    b -= (m * this.model.signature.upper);

    return [m, b, s];
  }

  public getStringForTime(time: number, withOriginOne: boolean): string {
    const mbs = this.getTimeAsMBS(time);
    let m = mbs[0];
    let b = mbs[1];
    let s = mbs[2];

    if (withOriginOne) {
      m++;
      b++;
      s++;
    }

    const useSixteenth = s != 1;
    const useBeats = useSixteenth || b != 1;

    return m + (useBeats ? '.' + b : '') + (useSixteenth ? '.' + Math.floor(s) : '');
  }

  public getTimeIncrement(): number {
    const sixteenth = this.getSixteenthWidth();
    let ratio: number;

    if (sixteenth < 0.00001) {
      return 0;
    }

    if (this.model.adaptiveMode) {
      const desiredSpacing = this.adaptiveRatios[this.adaptiveIndex] * this.width;

      ratio = (16 * this.model.signature.upper) / this.model.signature.lower;

      if (ratio * sixteenth > desiredSpacing) {
        ratio /= this.model.signature.upper;

        while (sixteenth * ratio > desiredSpacing)
          ratio /= 2;
      } else {
        while (sixteenth * ratio * 2 < desiredSpacing)
          ratio *= 2;
      }
    } else {
      ratio = this.fixedIncrements[this.fixedIndex];
    }

    return ratio;
  }

  public snapToGrid(time: number): number {
    const ratio = this.getTimeIncrement();

    if (ratio) {
      return ratio * Math.floor(time / ratio);
    }

    return time * this.getSixteenthWidth();
  }

  //===============================================================================

  public moveSelection(event: ComponentMouseEvent): void {
    if (this._draggedItem == null || this._selectedSet.isEmpty())
      return;

    const currentPosition = {
      time: this._draggedItem.time,
      pitch: this._draggedItem.pitch,
    };

    if (this._initialPosition == null) {
      // We're starting a new drag
      this._initialPosition = currentPosition;

      // Find bounding box for selection
      const {left, right, top, bottom} = this.findSelectionBounds();

      // Deduce constraints for this box
      this._minDragOffset = {time: -left, pitch: -top};
      this._maxDragOffset = {
        time: this.model.maxTimeRange.end - right,
        pitch: MAX_PITCH - bottom,
      };
    }

    const dragOffset = {
      x: event.position.x - event.positionAtMouseDown.x,
      y: event.position.y - event.positionAtMouseDown.y,
    };

    const scaledX = Math.max(this._minDragOffset!.time,
      Math.min(dragOffset.x / this.getSixteenthWidth(),
        this._maxDragOffset!.time));

    const scaledY = Math.max(this._minDragOffset!.pitch,
      Math.min(-dragOffset.y / this.getSemitoneHeight(),
        this._maxDragOffset!.pitch));

    // Apply translate to itemDragged
    this._draggedItem.pitch = Math.round(this._initialPosition.pitch + scaledY);
    this._draggedItem.time = this._initialPosition.time + scaledX;

    // Snap to grid
    if (! event.modifiers.option) {
      this._draggedItem.time = this.snapToGrid(this._draggedItem.time);
    }

    // Now we determine the actual offset for all elements
    const gridOffsetX = this._draggedItem.time - currentPosition.time;
    const gridOffsetY = this._draggedItem.pitch - currentPosition.pitch;

    for (const s of this._selectedSet.items) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem.id)
        continue;

      const note = this.notes.find(n => n.id === s);

      if (note != null) {
        note.pitch += gridOffsetY;
        note.time += gridOffsetX;
      }
    }
  }

  private findSelectionBounds(): { top: number, bottom: number, left: number, right: number } {
    let left: number = Infinity;
    let right: number = -Infinity;
    let top: number = Infinity;
    let bottom: number = -Infinity;

    this.selectedNotes.forEach((note) => {
      if (left == null || note.time < left) {
        left = note.time;
      }

      if (right == null || note.time + note.duration > right) {
        right = note.time + note.duration;
      }

      if (top == null || note.pitch - 1 < top) {
        top = note.pitch - 1;
      }

      if (bottom == null || note.pitch > bottom) {
        bottom = note.pitch;
      }
    });

    return {left, right, top, bottom};
  }

  private dragEndPoints(event: ComponentMouseEvent): void {
    if (this._draggedItem == null)
      return;

    const currentDuration = this._draggedItem.duration;

    if (this._initialDuration == null) {
      this._initialDuration = currentDuration;

      let selectionRight: number | null = null;
      this.selectedNotes.forEach((note) => {
        if (selectionRight == null || note.time + note.duration > selectionRight) {
          selectionRight = note.time + note.duration;
        }
      });

      this._maxDurationOffset = this.model.maxTimeRange.end - (selectionRight??0);
    }

    const dragOffset = event.position.x - event.positionAtMouseDown.x;
    const scaledX = Math.min(this._maxDurationOffset!, dragOffset / this.getSixteenthWidth());

    // Apply to itemDragged
    this._draggedItem.duration = this._initialDuration! + scaledX;

    // snap to grid
    if (! event.modifiers.option) {
      const snappedEndPoint = this.snapToGrid(this._draggedItem.time + this._draggedItem.duration);
      this._draggedItem.duration = snappedEndPoint - this._draggedItem.time;
      this._draggedItem.duration = Math.max(0, this._draggedItem.duration);
    }

    // Now we determine the actual offset
    const gridOffsetX = this._draggedItem!.duration - currentDuration;

    for (const s of this.selectedNotes) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      // We temporarily allow negative values... will be clipped in mouseReleased
      s.duration += gridOffsetX;
    }
  }

  private dragStartPoints(event: ComponentMouseEvent): void {
    if (this._draggedItem == null)
      return;

    const currentStart = this._draggedItem.time;
    const currentDuration = this._draggedItem.duration;

    // On first call of a drag action
    if (this._initialStart == null) {
      this._initialStart = currentStart;
      this._initialDuration = currentDuration;

      for (const s of this.selectedNotes) {
        s.initialStart = s.time;
      }

      let selectionLeft: number | null = null;

      this.selectedNotes.forEach((note) => {
        if (selectionLeft == null || note.time < selectionLeft) {
          selectionLeft = note.time;
        }
      });

      this._minStartOffset = -selectionLeft!;
    }

    const dragOffset = event.position.x - event.positionAtMouseDown.x;
    const scaledX = Math.max(this._minStartOffset!, dragOffset / (this.getSixteenthWidth() ?? 1));
    const currentEndPoint = this._draggedItem.time + this._draggedItem.duration;

    // Apply to itemDragged
    this._draggedItem.time = Math.min(currentEndPoint, this._initialStart + scaledX);
    this._draggedItem.duration = Math.max(0, this._initialDuration! - scaledX);

    // snap to grid
    if (! event.modifiers.option && this._draggedItem.duration > 0) {
      this._draggedItem.time = this.snapToGrid(this._draggedItem.time);
      this._draggedItem.duration = Math.max(0, this._initialDuration! - (this._draggedItem.time - this._initialStart));
    }

    // Now we determine the actual offset since beginning of drag
    const startOffset = this._draggedItem.time - this._initialStart;

    for (const s of this.selectedNotes) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      const endPoint = s.time + s.duration;

      s.time = s.initialStart + startOffset;
      s.time = Math.min(s.time, endPoint);
      s.duration = Math.max(0, endPoint - s.time)
    }
  }

  private dragVelocity(event: ComponentMouseEvent): void {
    // Can only apply to itemDragged
    if (this._draggedItem == null) {
      return;
    }

    if (this._initialVelocity == null) {
      this._initialVelocity = this._draggedItem.velocity;
    }

    const dragOffset = event.position.y - event.positionAtMouseDown.y;

    this._draggedItem.velocity = this._initialVelocity - dragOffset;
    this._draggedItem.velocity = Math.max(0, Math.min(this._draggedItem.velocity, 127));

    this._currentVelocity = this._draggedItem.velocity;
  }

  //===============================================================================
  // Rendering
  private drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number, start: number, end: number): void {
    const incr = this.getTimeIncrement();

    if (incr < 0)
      return;

    this.model.theme.drawTimeBackground(g, this.height, sixteenth, incr, start, end, this.model.signature,
      this.model.colors);
  }

  private drawNotes(g: CanvasRenderingContext2D, semiHeight: number, sixteenth: number): void {
    for (const n of this._notes) {
      if (n.hidden) {
        continue;
      }

      const x = this.getPositionForTime(n.time);
      const y = this.getPositionForPitch(n.pitch);
      const w = Math.max(0, n.tempDuration != null ? n.tempDuration * sixteenth : n.duration * sixteenth);
      this.model.theme.drawNote(g, x, y, w, semiHeight, n.velocity, n.selected, this.model.colors);
    }
  }

  private removeOverlaps(apply: boolean): void {
    // These are temp attributes to show truncated/removed notes
    // without actually performing the action on notes
    // They are used here when apply is false and in drawNotes()
    for (const note of this._notes) {
      note.tempDuration = undefined;
      note.hidden = undefined;
    }

    for (const selected of this.selectedNotes) {
      for (const note of this._notes) {
        if (selected == note)
          continue;

        if (selected.pitch != note.pitch)
          continue;

        // If selected precedes note
        if (selected.time <= note.time) {
          // If selected overlaps over note
          if (note.time < selected.time + selected.duration) {
            // If note is also selected, we won't remove it
            if (! note.selected) {
              if (apply)
                this.removeNote(note.id);
              else
                note.hidden = true;
            }
          }
          // If note precedes selected
        } else {
          // If selected overlaps over note, shorten note
          if (selected.time < note.time + note.duration) {
            if (apply) {
              note.duration = selected.time - note.time;
            } else {
              note.tempDuration = Math.max(0, selected.time - note.time);
            }
          }
        }
      }
    }

    this.repaintParent();
  }

  private getDragActionForNoteAt(pos: Point, n: Note): DragAction {
    const margin = 3;
    const noteX = this.getPositionForTime(n.time);
    const noteW = Math.max(2, n.duration * this.getSixteenthWidth());
    const localPos = pos.x - noteX;

    if (localPos > noteW) return 'NONE';
    if (localPos >= noteW - margin) return 'RIGHT';
    if (localPos >= margin) return 'MOVE_NOTE';
    if (localPos >= 0) return 'LEFT';
    return 'NONE';
  }

  private findNoteAt(pos: Point): Note | null {
    // We need to iterate from end to start to have front most notes first
    for (const note of this.notes) {
      const x = this.getPositionForTime(note.time);
      const y = this.getPositionForPitch(note.pitch);
      const w = Math.max(2, note.duration * this.getSixteenthWidth());
      const h = this.getSemitoneHeight();

      if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
        return note;
      }
    }

    return null;
  }

  private setMouseCursor(action: DragAction): void {
    switch (action) {
      case 'MOVE_NOTE':
        this.mouseCursor = 'move';
        break;
      case 'LEFT':
        this.mouseCursor = 'w-resize';
        break;
      case 'RIGHT':
        this.mouseCursor = 'e-resize';
        break;
      default:
        this.mouseCursor = 'default';
    }
  }

  private renderFlags(g: CanvasRenderingContext2D): void {
    this.flags.forEach((flag) => {
      const pos = this.getPositionForTime(flag.time);
      g.fillStyle = flag.color;
      g.fillRect(pos, 0, 1, this.height);
    });
  }

  private changed(): void {
    this.noteSequencer.notesChanged();
  }

  private getNoteBounds(note: Note): IRectangle {
    return {
      x: this.getPositionForTime(note.time),
      y: this.getPositionForPitch(note.pitch),
      width: Math.max(2, note.duration * this.getSixteenthWidth()),
      height: this.getSemitoneHeight(),
    };
  }
}
