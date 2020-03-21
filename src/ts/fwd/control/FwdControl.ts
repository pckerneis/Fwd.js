export interface SliderOptions {
  defaultValue: number,
  min: number,
  max: number
}

export class FwdSlider {
  private _value: number;

  public get value(): number { return this._value; }

  public readonly min: number;

  public readonly max: number;

  constructor(options: SliderOptions) {
    this._value = options.defaultValue;
    this.min = options.min;
    this.max = options.max;
  }
}

type FwdControl = FwdSlider;

export class FwdControls {
  private _controls = new Map<string, FwdControl>();

  addSlider(name: string, options: SliderOptions) {
    this._controls.set(name, new FwdSlider(options));
  }

  getSlider(name: string): FwdSlider {
    const control = this._controls.get(name);
    return control as FwdSlider;
  }
}