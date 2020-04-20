type ControlType = 'slider';

export interface ValueSource<T> {
  get(): T;
}

//=============================================================

export interface SliderOptions {
  defaultValue: number,
  min: number,
  max: number,
  step: number,
}

export class FwdSlider {

  public readonly min: number;

  public readonly max: number;

  public readonly step: number;

  public readonly type: ControlType = 'slider';

  constructor(private _valueSource: ValueSource<number>, options: SliderOptions) {
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
  }

  public get value(): number { return this._valueSource.get(); }
}

//=============================================================

export type FwdController = FwdSlider;

export interface FwdControls {
  readonly htmlElement: HTMLElement;

  reset(): void;
  addSlider(name: string, options: SliderOptions): FwdSlider;
  getSlider(name: string): FwdSlider;
}

