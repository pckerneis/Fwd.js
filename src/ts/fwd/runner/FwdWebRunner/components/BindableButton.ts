import { injectStyle } from '../StyleInjector';
import debounce from '../../../utils/debounce';
import { Popover } from './Popover';

export interface BindableControl {
  controlElement: HTMLElement;

  triggerKeyAction(sourceBinding: KeyBinding): void;
  setKeyBindingMode(bindingMode: boolean): void;
  setKeyBindings(bindings: KeyBinding[]): void;
}

export interface KeyBinding {
  code: string,
  control: BindableControl;
}

export class ControlBindingManager {
  private _keyBindings: KeyBinding[] = [];

  private _controlBeingEdited: BindableControl = null;

  private readonly _popover: Popover;

  private textToShowIfNoMapping = '(none)';

  constructor() {
    document.addEventListener('keydown', (evt) => this.handleKeyDown(evt.code));
    this._popover = new Popover();
    this._popover.setInnerHTML(this.textToShowIfNoMapping);
  }

  setControlBeingEdited(control: BindableControl) {
    if (this._controlBeingEdited !== null) {
      this._controlBeingEdited.setKeyBindingMode(false);
    }

    this._controlBeingEdited = control;

    if (this._controlBeingEdited !== null) {
      const keyBindingsForControl = this._keyBindings.filter(binding => binding.control === control);
      control.setKeyBindingMode(true);
      this._popover.sourceElement = control.controlElement;
      this._popover.setInnerHTML(this.getKeyBindingsAsString(keyBindingsForControl));
      this._popover.show();
    } else {
      this._popover.hide();
    }
  }

  private handleKeyDown(code: string) {
    if (this._controlBeingEdited !== null) {
      if (code === 'Escape') {
        this._controlBeingEdited.setKeyBindingMode(false);
        this._controlBeingEdited = null;
        return;
      }

      this.toggleKeyBinding(this._controlBeingEdited, code);
    } else {
      this.dispatchKeyEvent(code);
    }
  }

  private toggleKeyBinding(control: BindableControl, code: string) {
    const existingBinding = this.getKeyBinding(control, code);

    if (existingBinding) {
      this._keyBindings = this._keyBindings.filter((binding) => binding != existingBinding);
    } else {
      this._keyBindings.push({ control, code });
    }

    const keyBindingsForControl = this._keyBindings.filter(binding => binding.control === control);
    control.setKeyBindings(keyBindingsForControl);
    this._popover.setInnerHTML(this.getKeyBindingsAsString(keyBindingsForControl));
  }

  private getKeyBindingsAsString(keyBindings: KeyBinding[]): string {
    return keyBindings.length === 0 ? this.textToShowIfNoMapping :
        keyBindings.map(binding => `${binding.code.replace('Key', '')}`)
        .join(' ');
  }

  private getKeyBinding(control: BindableControl, code: string): KeyBinding {
    const results = this._keyBindings.filter((binding) => {
      return binding.code === code && binding.control === control;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchKeyEvent(code: string): void {
    const bindings = this._keyBindings.filter((binding) => binding.code === code);
    bindings.forEach((binding) => {
      binding.control.triggerKeyAction(binding);
    });
  }
}

const controlBindingManager = new ControlBindingManager();

export class BindableButton implements BindableControl {
  public readonly htmlElement: HTMLElement;

  public action: Function;

  private _button: HTMLButtonElement;

  private _indicator: HTMLSpanElement;

  private _releaseBlinkDebounced: Function;

  private _active = true;

  constructor(label: string) {
    this.htmlElement = this._button = document.createElement('button');
    this._button.classList.add('bindable-button');
    this.text = label;

    this._button.onclick = () => {
      if (this._active && this.action != null) {
        this.action();
      }
    }

    this._button.addEventListener('contextmenu', (evt: MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      evt.cancelBubble = true;
      return false;
    });

    this._button.oncontextmenu = (evt: MouseEvent) => {
      controlBindingManager.setControlBeingEdited(this);
    }

    this._button.onblur = (evt: MouseEvent) => {
      controlBindingManager.setControlBeingEdited(null);
    }

    this._indicator = document.createElement('span');
    this._indicator.classList.add('indicator');
    this._button.append(this._indicator);
  }

  set active(active: boolean) {
    if (active) {
      this._button.classList.add('active');
    } else {
      this._button.classList.remove('active');
    }

    this._active = active;
  }

  get active(): boolean {
    return this._active;
  }

  public get controlElement(): HTMLElement { return this.htmlElement; }

  public get text(): string { return this._button.innerText; }
  public set text(newLabel: string) { this._button.innerText = newLabel; }

  public get disabled(): boolean { return this._button.disabled; }
  public set disabled(disabled: boolean) { this._button.disabled = disabled; }
  
  public triggerKeyAction(sourceBinding: KeyBinding) {
    if (this._active) {
      this.blink();
      this.action();
    }
  }

  setKeyBindings(bindings: KeyBinding[]) {
    if (bindings === null || bindings.length === 0) {
      this._indicator.classList.remove('bound');
      return;
    }

    this._indicator.classList.add('bound');

  }

  setKeyBindingMode(bindingMode: boolean) {
    if (bindingMode) {
      this._button.classList.add('binding');
    } else {
      this._button.classList.remove('binding');
    }
  }

  private blink() {
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

  .bindable-button.binding {
    background: #69b2cf61;
  }
`);