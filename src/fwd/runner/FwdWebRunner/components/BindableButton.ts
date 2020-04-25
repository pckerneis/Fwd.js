import debounce from '../../../utils/debounce';
import { injectStyle } from '../StyleInjector';
import { BindableController, ControlBinding, ControlBindingManager, ControllerKind, KeyBinding } from './BindableController';

export class BindableButton implements BindableController {
  public readonly htmlElement: HTMLElement;

  public action: Function;

  public readonly controllerKind: ControllerKind = 'button';

  public controllerId: number;

  private _button: HTMLButtonElement;

  private readonly _indicator: HTMLSpanElement;

  private _releaseBlinkDebounced: Function;

  private _active: boolean = true;

  constructor(public readonly controllerName: string) {
    this.htmlElement = this._button = document.createElement('button');
    this._button.classList.add('bindable-button');
    this.text = controllerName;

    this._button.onclick = () => {
      if (this._active && this.action != null) {
        this.action();
      }
    };
    
    this._button.oncontextmenu = (evt: MouseEvent) => {
      ControlBindingManager.getInstance().setControlBeingEdited(this);
      evt.preventDefault();
      evt.stopPropagation();
      evt.cancelBubble = true;
      return false;
    };

    this._indicator = document.createElement('span');
    this._indicator.classList.add('indicator');
    this._button.append(this._indicator);
  }

  public set active(active: boolean) {
    if (active) {
      this._button.classList.add('active');
    } else {
      this._button.classList.remove('active');
    }

    this._active = active;
  }

  public get active(): boolean {
    return this._active;
  }

  public get controlElement(): HTMLElement { return this.htmlElement; }

  public get text(): string { return this._button.innerText; }
  public set text(newLabel: string) { this._button.innerText = newLabel; }

  public get disabled(): boolean { return this._button.disabled; }
  public set disabled(disabled: boolean) { this._button.disabled = disabled; }
  
  // ====================================================================

  public acceptsBinding(binding: ControlBinding): boolean {
    return binding.kind === 'NoteOn' || binding.kind === 'KeyPress';
  }

  public triggerKeyAction(sourceBinding: KeyBinding): void {
    if (this._active) {
      this.blink();
      this.action();
    }
  }

  public setBindings(bindings: ControlBinding[]): void {
    if (bindings === null || bindings.length === 0) {
      this._indicator.classList.remove('bound');
      return;
    }

    this._indicator.classList.add('bound');
  }

  public setBindingMode(bindingMode: boolean): void {
  }

  public handleNoteOn(noteNumber: number, velocity: number, channel: number, deviceId: string): void {
    if (this.active) {
      this.blink();
      this.action();
    }
  }

  public handleControlChange(value: number, ccNumber: number, channel: number, deviceId: string): void {
    throw new Error('Method not implemented.');
  }

  // ====================================================================
  
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

injectStyle(BindableButton.name, `
  .indicator {
    background: rgba(0, 0, 0, 0.3);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin: auto 0 auto 7px;
  }

  .indicator.bound.blinking {
    background: #00b7ff;
  }

  .indicator.bound {
    background: #69b2cfa1;
  }
  
  button.bindable-button:not(.active):focus {
    outline: none;
  }

  button.bindable-button,
  button.bindable-button:hover {
    display: flex;
    padding-right: 7px;

    color: grey;
    border-color: #00000030;
  }

  button.bindable-button.active {
    border-color: #00000050;
    color: black;
  }

  button.bindable-button.active:hover {
    border-color: #00000088;
  }
`);