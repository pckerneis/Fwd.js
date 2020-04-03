import { ControlBindingManager } from '../runner/FwdWebRunner/components/BindableController';
import { BindableSlider } from '../runner/FwdWebRunner/components/BindableSlider';
import { injectStyle } from '../runner/FwdWebRunner/StyleInjector';
import { FwdController, FwdControls, FwdSlider, SliderOptions, ValueSource } from './FwdControl';

export class FwdHTMLControls implements FwdControls {
  public readonly htmlElement: HTMLDivElement;

  private _controls: Map<string, FwdController> = new Map<string, FwdController>();

  private readonly _controlsElement: HTMLDivElement;

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

    const sliderController = new BindableSlider(name, options);
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

    ControlBindingManager.getInstance().registerController(sliderController);
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
`);