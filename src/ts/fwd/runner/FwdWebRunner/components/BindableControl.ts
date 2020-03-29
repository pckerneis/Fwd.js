import { Popover } from './Popover';

export interface BindableControl {
  controlElement: HTMLElement;
  active: boolean;

  triggerKeyAction(sourceBinding: KeyBinding): void;
  setKeyBindingMode(bindingMode: boolean): void;
  setKeyBindings(bindings: KeyBinding[]): void;
}

export interface KeyBinding {
  code: string,
  control: BindableControl;
}

let controlBindingManager: ControlBindingManager = null;

export class ControlBindingManager {
  private _keyBindings: KeyBinding[] = [];

  private _controlBeingEdited: BindableControl = null;

  private readonly _popover: Popover;

  private textToShowIfNoMapping = '(none)';

  private constructor() {
    document.addEventListener('keydown', (evt) => this.handleKeyDown(evt.code));
    this._popover = new Popover();
    this._popover.setInnerHTML(this.textToShowIfNoMapping);
  }

  public static getInstance() {
    if (controlBindingManager === null) {
      controlBindingManager = new ControlBindingManager();
    }

    return controlBindingManager;
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

      this._popover.onclose = () => {
        control.setKeyBindingMode(false);
        this._controlBeingEdited = null;
      }
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
      if (binding.control.active) {
        binding.control.triggerKeyAction(binding);
      }
    });
  }
}