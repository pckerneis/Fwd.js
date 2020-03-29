import { injectStyle } from '../runner/FwdWebRunner/StyleInjector';
import { ValueSource, FwdController, SliderOptions, FwdControls, FwdSlider } from './FwdControl';
import audit from '../utils/audit';

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

//=============================================================

export class FwdHTMLControls implements FwdControls {
  public readonly htmlElement: HTMLDivElement;

  private _controls: Map<string, FwdController> = new Map<string, FwdController>();

  private _controlsElement: HTMLDivElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('controls-row');

    this._controlsElement = document.createElement('div');
    this._controlsElement.classList.add('controls-container');
    this.htmlElement.append(this._controlsElement);
  }

  public reset(): void {
    this._controlsElement.innerHTML = '';
    this._controls = new Map<string, FwdController>();
  }

  public addSlider(name: string, options: SliderOptions): void {
    if (this.nameIsAlreadyUsed(name)) {
      // fwd.err(`There's already a controller with the name ${name}.`);
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
    this._controlsElement.append(row);

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

injectStyle('FwdWebControls', `
.controls-row {
  display: flex;
  justify-content: center;
  overflow: auto;
  min-width: 120px;
  min-height: 100px;
  flex-shrink: 0;
}

.controls-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  font-family: monospace;
  padding: 5px 8px;
  margin-bottom: 6px;
  max-width: 500px;
}

.controls-container > * {
  padding: 2px 5px;
}

.controls-container .slider {
  max-width: 300px;
}

.slider-row {
  display: flex;
  grid-template-columns: 1fr 2fr;
  flex-wrap: wrap;
}

.slider-row label {
  margin: 4px 10px;
  width: 30%;
  min-width: 80px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slider-row .slider {
  flex-grow: 1;
}

.slider-control {
  flex-grow: 1;
  display: flex;
}

.slider-textbox {
  width: 65px;
  padding: 4px 5px;
  margin-left: 12px;
  background: #00000005;
  box-shadow: 1px 1px 4px #0000002c inset;
  border: none;
  border-radius: 3px;
}
`);