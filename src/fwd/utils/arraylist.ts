// Mutable list based on array. Just adds convenience methods such as
// insert.
export class ArrayList<T> {
  
  private _array: T[];
  
  constructor() {
    this._array = [];
  }
  
  public get array(): T[] {
    return this._array;
  }

  public add(item: T): void {
    this._array.push(item);
  }

  public remove(item: T): void {
    this.removeAt(this._array.indexOf(item));
  }

  public removeAt(index: number): void {
    this._array.splice(index, 1);
  }

  public removeIfMatch(predicate: (item: T) => boolean): void {
    this._array = this._array.filter(item => ! predicate(item));
  }

  public insert(index: number, item: T): void {
    this._array = [
      ...this._array.slice(0, index),
      item,
      ...this._array.slice(index),
    ];
  }

  public clear(): void {
    this._array = [];
  }

  public size(): number {
    return this._array.length;
  }

  public get(idx: number): T | undefined {
    return this._array[idx];
  }
}
