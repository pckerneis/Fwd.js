import { Colors } from '../../NoteSequencer/note-sequencer';
import { Component, ComponentMouseEvent } from '../BaseComponent';
import { IRectangle } from '../Rectangle';
import { SelectedItemSet } from './SelectedItemSet';

interface Lasso {
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  commuteMode: boolean,
  commutableSelection: number[],
}

export class LassoSelector {

  public findAllElementsInLasso: (lassoBounds: IRectangle) => number[];

  private lasso?: Lasso;

  constructor(public readonly ownerComp: Component, public readonly selectedItemSet: SelectedItemSet,
              public readonly colors: Colors) {
  }

  public beginLasso(event: ComponentMouseEvent): void {
    const ownerPos = this.ownerComp.getPosition();

    this.lasso = {
      startX: event.position.x - ownerPos.x,
      startY: event.position.y - ownerPos.y,
      endX: event.position.x - ownerPos.x,
      endY: event.position.y - ownerPos.y,
      commuteMode: event.modifiers.shift,
      commutableSelection: [],
    };

    if (event.modifiers.shift) {
      this.lasso.commutableSelection = this.selectedItemSet.items;
    }
  }

  public endLasso(): void {
    this.lasso = undefined;
  }

  public dragLasso(event: ComponentMouseEvent): void {
    if (this.lasso == null) {
      return;
    }

    const ownerPos = this.ownerComp.getPosition();

    this.lasso.endX = event.position.x - ownerPos.x;
    this.lasso.endY = event.position.y - ownerPos.y;

    const lassoBounds: IRectangle = {
      x: Math.min(this.lasso.startX, this.lasso.endX),
      y: Math.min(this.lasso.startY, this.lasso.endY),
      width: Math.abs(this.lasso.startX - this.lasso.endX),
      height: Math.abs(this.lasso.startY - this.lasso.endY),
    };


    let lassoSelection;

    if (typeof this.findAllElementsInLasso === 'function') {
      lassoSelection = this.findAllElementsInLasso(lassoBounds);
    }

    if (lassoSelection == null)
      return;

    if (this.lasso.commuteMode) {
      // Restore selection from mouse down
      this.selectedItemSet.deselectAll();

      for (let s of this.lasso.commutableSelection)
        this.selectedItemSet.addToSelection(s);

      // Browse current lasso selection
      for (let s of lassoSelection) {
        if (this.selectedItemSet.items.includes(s)) {
          // If the item is already selected, deselect it
          this.selectedItemSet.removeFromSelection(s);
        } else {
          // Else add it to the selection
          this.selectedItemSet.addToSelection(s);
        }
      }
    } else {
      this.selectedItemSet.deselectAll();

      for (let s of lassoSelection)
        this.selectedItemSet.addToSelection(s);
    }
  }

  public drawLasso(g: CanvasRenderingContext2D): void {
    if (this.lasso == null) {
      return;
    }

    g.fillStyle = this.colors.lassoBackground;
    g.strokeStyle = this.colors.lassoOutline;
    g.lineWidth = 2;

    const x = Math.min(this.lasso.startX, this.lasso.endX);
    const y = Math.min(this.lasso.startY, this.lasso.endY);
    const w = Math.max(this.lasso.startX, this.lasso.endX) - x;
    const h = Math.max(this.lasso.startY, this.lasso.endY) - y;

    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
  }
}
