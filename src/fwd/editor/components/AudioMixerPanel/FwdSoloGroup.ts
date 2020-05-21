export class FwdSoloGroup<T extends AbstractSoloGroupItem> {

  private readonly _items: T[] = [];
  private _soloed: T[] = [];

  private static isSoloGroupItem(item: any): boolean {
    return item instanceof AbstractSoloGroupItem;
  }

  public add(item: T): void {
    if (! FwdSoloGroup.isSoloGroupItem(item) || this._items.includes(item)) {
      return;
    }

    this._items.push(item);
    item.soloGroup = this;

    if (this._soloed.length > 0) {
      item.soloGainNode.gain.value = 0;
    }

    item.onSoloChange(false);
    console.log('add');
  }

  public remove(item: T): void {
    if (! FwdSoloGroup.isSoloGroupItem(item)) {
      return;
    }

    if (this.isSoloed(item)) {
      this.unsolo(item);
    }

    this._items.filter(i => i !== item);
    this._soloed.filter(i => i !== item);
  }


  public solo(itemToSolo: T, unsoloOthers: boolean = true): void {
    if (! FwdSoloGroup.isSoloGroupItem(itemToSolo)
      || ! this._items.includes(itemToSolo)) {
      return;
    }

    console.log('solo ' + (itemToSolo as any).audioMixerTrack.trackName);

    // If we need to unsolo items
    if (unsoloOthers) {
      this._soloed.filter(item => item !== itemToSolo).forEach(item => {
        if (this.isSoloed(item)) {
          console.log('solo -> unsolo ' + (item as any).audioMixerTrack.trackName);
          item.onSoloChange(false);
          item.soloGainNode.gain.value = 0;
        }
      });

      this._soloed = [];
    }

    // If item is not already soloed
    if (! this.isSoloed(itemToSolo)) {
      this._soloed.push(itemToSolo);
      itemToSolo.onSoloChange(true);
      itemToSolo.soloGainNode.gain.value = 1;
    }
  }

  public unsolo(itemToUnsolo: T): void {
    if (! FwdSoloGroup.isSoloGroupItem(itemToUnsolo)
      || ! this.isSoloed(itemToUnsolo)) {
      return;
    }

    this._soloed = this._soloed.filter(item => item !== itemToUnsolo);
    itemToUnsolo.onSoloChange(false);

    if (this._soloed.length === 0) {
      this._items.forEach(item => {
        item.soloGainNode.gain.value = 1;
      });
    } else {
      this._items.forEach(item => {
        item.soloGainNode.gain.value = this.isSoloed(item) ? 1 : 0;
      });
    }
  }

  public unsoloAll(): void {
    this._soloed.forEach(soloed => soloed.onSoloChange(false));

    this._soloed = [];

    this._items.forEach(item => {
      item.soloGainNode.gain.value = 1;
    });
  }

  public isSoloed(item: T): boolean {
    return this._soloed.includes(item);
  }
}

export abstract class AbstractSoloGroupItem {
  protected _soloGainNode: GainNode;

  private _soloGroup: FwdSoloGroup<any>;

  protected constructor(public readonly audioContext: AudioContext) {
    this._soloGainNode = audioContext.createGain();
  }

  public get soloGainNode(): GainNode {
    return this._soloGainNode;
  }

  public set soloGainNode(newNode: GainNode) {
    this._soloGainNode = newNode;
  }

  public set soloGroup(newGroup: FwdSoloGroup<any>) {
    if (this._soloGroup === newGroup) {
      return;
    }

    this._soloGroup = newGroup;
  }

  public isSoloed(): boolean {
    return this._soloGroup ? this._soloGroup.isSoloed(this) : false;
  }

  public solo(unsoloOthers: boolean): void {
    if (this._soloGroup) {
      this._soloGroup.solo(this, unsoloOthers);
    } else {
      throw new Error('Cannot solo a track that doesn\'t belong to a solo group');
    }
  }

  public unsolo(): void {
    if (this._soloGroup) {
      this._soloGroup.unsolo(this);
    } else {
      throw new Error('Cannot unsolo a track that doesn\'t belong to a solo group');
    }
  }

  public abstract onSoloChange(isSoloed: boolean): void;
}

