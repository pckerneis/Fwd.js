import { SliderOptions } from '../../../control/FwdControl';
import { map } from '../../../core/utils/numbers';
import audit from '../../../utils/audit';
import debounce from '../../../utils/debounce';
import { injectStyle } from '../StyleInjector';
import { BindableController, ControlBinding, ControlBindingManager, ControllerKind, KeyBinding } from './BindableController'

export class BindableSlider implements BindableController {
  public readonly htmlElement: HTMLElement;

  public controllerId: number;

  public readonly controllerKind: ControllerKind = 'slider';

  private readonly _input: HTMLInputElement;

  private readonly _textInput: HTMLInputElement;

  private readonly _indicator: HTMLSpanElement;

  private _releaseBlinkDebounced: Function;

  constructor(public readonly controllerName: string, options: SliderOptions) {
    this._indicator = document.createElement('span');
    this._indicator.classList.add('slider-binding-indicator');

    this._input = BindableSlider.prepareInput(options, true);
    this._textInput = BindableSlider.prepareInput(options, false);
    
    this._input.oninput = audit(() => {
      this._textInput.value = this._input.value;
    });

    this._textInput.onchange = () => {
      this._input.value = this._textInput.value;
    };

    const div = document.createElement('div');
    div.classList.add('slider-control');
    div.append(this._indicator, this._input, this._textInput);
    div.append(this._textInput);
    this.htmlElement = div;

    this.addBindingModeHandler();
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
      input.classList.add('slider-text-box');
    }

    return input;
  }

  public get value(): number {
    return this._input.value === '' ? 0 : Number.parseFloat(this._input.value);
  }

  // ====================================================================================

  public get controlElement(): HTMLElement { return this.htmlElement; }

  public get active(): boolean { return true; }

  public acceptsBinding(binding: ControlBinding): boolean {
    return binding.kind === 'ControlChange';
  }

  public setBindingMode(bindingMode: boolean): void {
  }

  public setBindings(bindings: ControlBinding[]): void {
    if (bindings === null || bindings.length === 0) {
      this._indicator.classList.remove('bound');
      return;
    }

    this._indicator.classList.add('bound');
  }

  public triggerKeyAction(sourceBinding: KeyBinding): void {
    throw new Error('Method not implemented.');
  }

  public handleNoteOn(noteNumber: number, velocity: number, channel: number, deviceId: string): void {
    throw new Error('Method not implemented.');
  }

  public handleControlChange(value: number, ccNumber: number, channel: number, deviceId: string): void {
    const mappedValue = map(value, 0, 127, Number(this._input.min), Number(this._input.max));
    this._input.value = mappedValue.toString();
    this._textInput.value = mappedValue.toFixed(1);
    this.blink();
  }

  // ====================================================================

  private addBindingModeHandler(): void {
    this.htmlElement.oncontextmenu = (evt: MouseEvent) => {
      ControlBindingManager.getInstance().setControlBeingEdited(this);
      evt.preventDefault();
      evt.stopPropagation();
      evt.cancelBubble = true;
      return false;
    }
  }

  private blink(): void {
    const releaseTime = 300;
    const cssClass = 'blinking';

    this._indicator.classList.add(cssClass);

    if (this._releaseBlinkDebounced == null) {
      this._releaseBlinkDebounced = debounce(() => {
        this._indicator.classList.remove(cssClass);
      }, releaseTime);
    }

    this._releaseBlinkDebounced();
  }
}

injectStyle('BindableSlider', `
.slider-control {
  flex-grow: 1;
  display: flex;
}

.slider-text-box {
  width: 65px;
  padding: 4px 5px;
  margin-left: 12px;
  background: #00000005;
  box-shadow: 1px 1px 4px #0000002c inset;
  border: none;
  border-radius: 3px;
}

.slider-binding-indicator {
  background: rgba(0, 0, 0, 0.3);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: auto 12px auto 7px;
}

.slider-binding-indicator.bound.blinking {
  background: #00b7ff;
}

.slider-binding-indicator.bound {
  background: #69b2cfa1;
}

input[type=range]::-webkit-slider-thumb {
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25);
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  -webkit-appearance: none;
  margin-top: -4.8px;
}
`);