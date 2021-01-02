export class SequenceGenerator {
  private _latest: number = 0;

  public next(): number {
    return ++this._latest;
  }
}
