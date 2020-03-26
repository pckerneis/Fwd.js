import { fwd } from '../core/Fwd';
import audit from '../utils/audit';

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

  public readonly min: number;

  public readonly max: number;

  public readonly step: number;

  constructor(private _valueSource: ValueSource<number>, options: SliderOptions) {
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
  }

  public get value(): number { return this._valueSource.get(); }
}

//=============================================================

type FwdControl = FwdSlider; 

export interface FwdControls {
  reset(): void;
  addSlider(name: string, options: SliderOptions): any;
  getSlider(name: string): FwdSlider;
}

//=============================================================

class SliderController {
  public readonly htmlElement: HTMLElement;

  private readonly _input: HTMLInputElement;

  private readonly _textInput: HTMLInputElement;

  constructor(options: SliderOptions) {
    this._input = SliderController.prepareInput(options, true);
    this._textInput = SliderController.prepareInput(options, false);
    
    this._input.oninput = audit(() => {
      this._textInput.value = this._input.value;
    });

    this._textInput.onchange = () => {
      this._input.value = this._textInput.value;
    };

    const div = document.createElement('div');
    div.classList.add('slider-control');
    div.append(this._input);
    div.append(this._textInput);
    this.htmlElement = div;
  }

  private static prepareInput(options: SliderOptions, range: boolean): HTMLInputElement {
    const input = document.createElement('input');
    input.min = options.min.toString();
    input.max = options.max.toString();
    input.step = options.step.toString();
    input.defaultValue = options.defaultValue.toString();

    if (range) {
      input.type = 'range';
      input.classList.add('slider');
    } else {
      input.type = 'number';
      input.classList.add('slider-textbox');
    }

    return input;
  }

  public get value(): number {
    return this._input.value === '' ? 0 : Number.parseFloat(this._input.value);
  }
}

export class FwdHTMLControls {
  private _elementContainer: HTMLDivElement;

  private _controls: Map<string, FwdControl> = new Map<string, FwdControl>();

  constructor() {
    this._elementContainer = document.getElementById('controls') as HTMLDivElement;
    this._elementContainer.innerHTML = '';
  }

  public reset(): void {
    this._elementContainer.innerHTML = '';
    this._controls = new Map<string, FwdControl>();
  }

  public addSlider(name: string, options: SliderOptions): void {
    if (this.nameIsAlreadyUsed(name)) {
      fwd.err(`There's already a controller with the name ${name}.`);
      return;
    }

    // Create HTML controls
    const row = document.createElement('div');
    row.classList.add('slider-row');

    const label = document.createElement('label');
    label.innerText = name;

    const sliderController = new SliderController(options);
    row.append(label);
    row.append(sliderController.htmlElement);
    this._elementContainer.append(row);

    const valueSource: ValueSource<number> = {
      get(): number {
        return sliderController.value;
      },
    };

    // Add to internal array
    this._controls.set(name, new FwdSlider(valueSource, options));
  }

  public getSlider(name: string): FwdSlider {
    const control = this._controls.get(name);
    return control as FwdSlider;
  }

  public nameIsAlreadyUsed(name: string): boolean {
    return this._controls.get(name) != null;
  }
}
