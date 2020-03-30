import { Popover } from './Popover';
import webmidi, { InputEventNoteon, InputEventControlchange } from 'webmidi';

export interface BindableControl {
  controlElement: HTMLElement;
  active: boolean;

  triggerKeyAction(sourceBinding: KeyBinding): void;
  setKeyBindingMode(bindingMode: boolean): void;
  setKeyBindings(bindings: KeyBinding[]): void;

  handleNoteOn(noteNumber: number, velocity: number, channel: number, deviceId: string): void;
  // handleControlChange(binding: MIDIBinding, event: InputEventControlchange): void;
}

export interface KeyBinding {
  code: string,
  control: BindableControl;
}

export interface DeviceID {
  id: string;
  name: string;
  index: number;
  manufacturer?: string;
}

export type MIDIBindingKind = 'noteOn' | 'noteOff' | 'controlChange';

export interface MIDIBinding {
  control: BindableControl;
  kind: MIDIBindingKind;
  noteNumber?: number;
  ccNumber?: number;
  deviceId: string; // DeviceID;
  midiChanel: number;
}

let controlBindingManager: ControlBindingManager = null;

export class ControlBindingManager {
  private _keyBindings: KeyBinding[] = [];

  private _midiBindings: MIDIBinding[] = [];

  private _controlBeingEdited: BindableControl = null;

  private readonly _popover: Popover;

  private textToShowIfNoMapping = '(none)';

  private constructor() {
    document.addEventListener('keydown', (evt) => this.handleKeyDown(evt.code));
    this._popover = new Popover();
    this._popover.setInnerHTML(this.textToShowIfNoMapping);
    this.watchIncomingMidi();
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

  //=======================================================================================

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

  //=======================================================================================

  private watchIncomingMidi() {
    webmidi.enable((err) => {
      webmidi.inputs.forEach((input) => {
        input.addListener('noteon', 'all', (event) => this.handleNoteOn(event));
        input.addListener('controlchange', 'all', (event) => this.handleControlChange(event));
        console.log('listener added for', input);
      });
    });
  }

  private handleNoteOn(noteOn: InputEventNoteon) {
    if (this._controlBeingEdited !== null) {
      console.log('note on, being edited')
      const deviceId = noteOn.target.id;
      const noteNumber = noteOn.note.number;
      const channel = noteOn.channel;
      const existingBinding = this.getNoteOnBinding(this._controlBeingEdited, deviceId, noteNumber, channel);
   
      if (existingBinding == null) {
        this._midiBindings.push({
          deviceId,
          kind: 'noteOn',
          midiChanel: channel,
          noteNumber,
          control: this._controlBeingEdited
        });
      }
    } else {
      this.dispatchNoteOn(noteOn);
    }
  }
  
  private getNoteOnBinding(control: BindableControl, deviceId: string, noteNumber: number, channel: number) {
    const results = this._midiBindings.filter(binding => {
      return binding.kind === 'noteOn'
        && binding.control === control
        && binding.midiChanel === channel
        && binding.noteNumber === noteNumber
        && binding.deviceId === deviceId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchNoteOn(event: InputEventNoteon) {
    this._midiBindings
      .filter((binding) => binding.kind === 'noteOn' 
                        && binding.deviceId === event.target.id 
                        && binding.midiChanel === event.channel
                        && binding.noteNumber === event.note.number)
      .forEach((binding) => {
        binding.control.handleNoteOn(event.note.number, event.velocity, event.channel, event.target.id);
      });
  }

  private handleControlChange(controlChange: InputEventControlchange) {
    console.log(controlChange);
    if (this._controlBeingEdited !== null) {
      const deviceId = controlChange.target.id;
      const ccNumber = controlChange.controller.number;
      const channel = controlChange.channel;
      const existingBinding = this.getControlChangeBinding(this._controlBeingEdited, deviceId, ccNumber, channel);
   
      if (existingBinding == null) {
        this._midiBindings.push({
          deviceId,
          kind: 'controlChange',
          midiChanel: channel,
          ccNumber,
          control: this._controlBeingEdited
        });
      }
    } else {
      this.dispatchControlChange(controlChange);
    }
  }
  
  private getControlChangeBinding(control: BindableControl, deviceId: string, ccNumber: number, channel: number) {
    const results = this._midiBindings.filter(binding => {
      return binding.kind === 'controlChange'
        && binding.control === control
        && binding.midiChanel === channel
        && binding.ccNumber === ccNumber
        && binding.deviceId === deviceId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchControlChange(event: InputEventControlchange) {
    this._midiBindings
      .filter((binding) => binding.kind === 'controlChange'
                        && binding.deviceId === event.target.id 
                        && binding.midiChanel === event.channel
                        && binding.ccNumber === event.controller.number)
      .forEach((binding) => {
        // binding.control.handleControlChange(binding, event);
      });
  }
}