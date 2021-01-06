import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

type Identifier = number;

function areArraysEqual(a: Identifier[], b: Identifier[]): boolean {
  return a.length === b.length
    && a.map((a, i) => b[i] === a)
      .reduce((acc, curr) => acc && curr, true);
}

export class SelectedItemSet {

  public readonly selection$: Observable<Identifier[]>;

  private readonly _selection: BehaviorSubject<Identifier[]>;
  private _itemAboutToBeSelected: Identifier | null = null;

  constructor() {
    this._selection = new BehaviorSubject<number[]>([]);
    this.selection$ = this._selection
      .pipe(distinctUntilChanged((a, b) => areArraysEqual(a, b)));
  }

  public get items(): Identifier[] {
    return [...this._selection.getValue()];
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public addToSelection(itemId: Identifier): void {
    this._selection.next([...this.items, itemId]);
  }

  // TODO: replace boolean by event
  public addToSelectionMouseDown(itemId: Identifier, isShiftKeyDown: boolean): boolean {
    if (this.items.includes(itemId)) {
      // The item is already selected
      if (isShiftKeyDown) {
        this.removeFromSelection(itemId);
        return true;
      }

      return false;

    } else {
      if (! isShiftKeyDown) {
        this.deselectAll();
      }

      this.addToSelection(itemId);
      return true;
    }
  }

  public addToSelectionMouseUp(wasMouseDragged: boolean, isShiftKeyDown: boolean, actionConsumedOnMouseDown: boolean): void {
    if (this._itemAboutToBeSelected == null
      || wasMouseDragged
      || actionConsumedOnMouseDown
      || this.items.includes(this._itemAboutToBeSelected))
      return;

    if (! isShiftKeyDown) {
      this.deselectAll();
    }

    this.addToSelection(this._itemAboutToBeSelected);
    this._itemAboutToBeSelected = null;
  }

  public setUniqueSelection(itemId: Identifier): void {
    this._selection.next([itemId]);
  }

  public removeFromSelection(itemId: Identifier): void {
    this._selection.next(this.items.filter(i => i !== itemId));
  }

  public deselectAll(): void {
    this._selection.next([]);
  }
}
