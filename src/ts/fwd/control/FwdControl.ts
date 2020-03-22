interface ValueSource<T> {
  get(): T;
}

export interface SliderOptions {
  defaultValue: number,
  min: number,
  max: number,
  step: number,
}

export class FwdSlider {
  public get value(): number { return this._valueSource.get(); }

  public readonly min: number;

  public readonly max: number;

  public readonly step: number;

  constructor(private _valueSource: ValueSource<number>, options: SliderOptions) {
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
  }
}

//=============================================================

type FwdControl = FwdSlider; 

export interface FwdControls {
  addSlider(name: string, options: SliderOptions): any;
  getSlider(name: string): FwdSlider;
}

//=============================================================

export class FwdHTMLControls {

  private _elementContainer: HTMLDivElement;

  private _controls = new Map<string, FwdControl>();

  constructor() {
    this._elementContainer = document.getElementById('controls') as HTMLDivElement;
    this._elementContainer.innerHTML = '';
  }

  addSlider(name: string, options: SliderOptions) {
    this.assertNameIsNotUsed(name);

    // Create HTML controls
    const row = document.createElement('div');
    row.classList.add('slider-row')

    const label = document.createElement('label');
    label.innerText = name;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = options.min.toString();
    input.max = options.max.toString();
    input.step = options.step.toString();
    input.classList.add('slider');
    input.defaultValue = options.defaultValue.toString();

    row.append(label);
    row.append(input);
    this._elementContainer.append(row);

    const valueSource: ValueSource<number> = {
      get(): number {
        return input.value === '' ? 0 : Number.parseFloat(input.value);
      }
    }

    // Add to internal array
    this._controls.set(name, new FwdSlider(valueSource, options));
  }

  getSlider(name: string): FwdSlider {
    const control = this._controls.get(name);
    return control as FwdSlider;
  }

  assertNameIsNotUsed(name: string) {
    if (this._controls.get(name) != null) {
      throw new Error(`There's already a control with the name ${name}.`)
    }
  }
}
