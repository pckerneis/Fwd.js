import webmidi, { InputEventNoteon, InputEventControlchange } from 'webmidi';
import { Overlay } from './Overlay';
import { injectStyle } from '../StyleInjector';

export interface BindableControl {
  controllerName: string;
  controlElement: HTMLElement;
  active: boolean;

  triggerKeyAction(sourceBinding: KeyBinding): void;
  setKeyBindingMode(bindingMode: boolean): void;

  setBindings(bindings: ControlBinding[]): void;

  handleNoteOn(noteNumber: number, velocity: number, channel: number, deviceId: string): void;
  // handleControlChange(binding: MIDIBinding, event: InputEventControlchange): void;
}

export interface KeyBinding {
  kind: 'Keyboard',
  code: string,
  control: BindableControl;
}

export interface DeviceID {
  id: string;
  name: string;
  index: number;
  manufacturer?: string;
}

export type MIDIBindingKind = 'NoteOn' | 'NoteOff' | 'ControlChange';

export interface MIDIBinding {
  control: BindableControl;
  kind: MIDIBindingKind;
  noteNumber?: number;
  ccNumber?: number;
  displayName: string;
  deviceId: string; // DeviceID;
  midiChanel: number;
}

export type ControlBinding = KeyBinding | MIDIBinding;

let controlBindingManager: ControlBindingManager = null;

export class ControlBindingManager {
  private _keyBindings: KeyBinding[] = [];

  private _midiBindings: MIDIBinding[] = [];

  private _controlBeingEdited: BindableControl = null;

  private readonly _overlay: Overlay;

  private constructor() {
    document.addEventListener('keydown', (evt) => this.handleKeyDown(evt.code));
    this._overlay = new Overlay();
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
    this.showMappingsOverlay();
  }

  private notifyEditedControl() {
    const bindingsForControl = [...this._keyBindings, ...this._midiBindings]
        .filter(binding => binding.control === this._controlBeingEdited);

    this._controlBeingEdited.setBindings(bindingsForControl);
  }

  //=======================================================================================

  private showMappingsOverlay() {
    if (this._controlBeingEdited !== null) {
      const control = this._controlBeingEdited;
      control.setKeyBindingMode(true);

      this.buildMappingsOverlay();

      this._overlay.show();

      this._overlay.onclose = () => {
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

      this.addKeyBinding(this._controlBeingEdited, code);
    } else {
      this.dispatchKeyEvent(code);
    }
  }

  private addKeyBinding(control: BindableControl, code: string) {
    const existingBinding = this.getKeyBinding(control, code);

    if (existingBinding === null) {
      this._keyBindings.push({ control, code, kind: 'Keyboard' });

      this.notifyEditedControl();
      this.showMappingsOverlay();
    }
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
          kind: 'NoteOn',
          midiChanel: channel,
          noteNumber,
          control: this._controlBeingEdited,
          displayName: `${noteOn.note.number} (${noteOn.note.name})`
        });
        
        this.notifyEditedControl();
        this.showMappingsOverlay();
      }
    } else {
      this.dispatchNoteOn(noteOn);
    }
  }
  
  private getNoteOnBinding(control: BindableControl, deviceId: string, noteNumber: number, channel: number) {
    const results = this._midiBindings.filter(binding => {
      return binding.kind === 'NoteOn'
        && binding.control === control
        && binding.midiChanel === channel
        && binding.noteNumber === noteNumber
        && binding.deviceId === deviceId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchNoteOn(event: InputEventNoteon) {
    this._midiBindings
      .filter((binding) => binding.kind === 'NoteOn' 
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
          kind: 'ControlChange',
          midiChanel: channel,
          ccNumber,
          control: this._controlBeingEdited,
          displayName: `${controlChange.controller.number} (${controlChange.controller.name})`
        });
      }
    } else {
      this.dispatchControlChange(controlChange);
    }
  }
  
  private getControlChangeBinding(control: BindableControl, deviceId: string, ccNumber: number, channel: number) {
    const results = this._midiBindings.filter(binding => {
      return binding.kind === 'ControlChange'
        && binding.control === control
        && binding.midiChanel === channel
        && binding.ccNumber === ccNumber
        && binding.deviceId === deviceId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchControlChange(event: InputEventControlchange) {
    this._midiBindings
      .filter((binding) => binding.kind === 'ControlChange'
                        && binding.deviceId === event.target.id 
                        && binding.midiChanel === event.channel
                        && binding.ccNumber === event.controller.number)
      .forEach((binding) => {
        // binding.control.handleControlChange(binding, event);
      });
  }
  
  buildMappingsOverlay() {
    const control = this._controlBeingEdited;

    this._overlay.container.innerHTML = '';

    const title = document.createElement('h2');
    title.innerHTML = `Edit mappings for <code>${control.controllerName}</code>`;
    title.classList.add('control-binding-container-name');
    this._overlay.container.append(title);

    const container = document.createElement('div');
    container.classList.add('control-binding-container');
    this._overlay.container.append(container);
    
    const keyBindingsForControl = this._keyBindings.filter(binding => binding.control === control);
    const midiBindingsForControl = this._midiBindings.filter(binding => binding.control === control);

    if (keyBindingsForControl.length === 0 && midiBindingsForControl.length === 0) {
      const firstPara = document.createElement('p');
      firstPara.innerText = 'No mapping defined.'; 
      
      const secondPara = document.createElement('p');
      secondPara.innerText = 'Press a key or move a MIDI controller to assign it to this controller.';

      container.append(firstPara, secondPara);
      container.classList.add('align-center');

      return;
    }

    const addRow = (rowName: string, binding: KeyBinding | MIDIBinding) => {
      const row = document.createElement('div');
      row.classList.add('control-binding-row');

      const label = document.createElement('label');
      label.innerText = rowName;
      label.classList.add('control-binding-name');

      const closeImage = document.createElement('img');
      closeImage.src = 'img/icon-close.png';
      closeImage.classList.add('control-binding-remove-button');
      closeImage.alt = 'Remove binding';

      row.append(label, closeImage);
      container.append(row);

      closeImage.onclick = () => this.removeBinding(binding);
    }

    const appendNone = () => {
      const p = document.createElement('p');
      p.innerText = '(none)';
      p.style.textAlign = 'center';
      container.append(p);
    }

    const keySectionTitle = document.createElement('h3');
    keySectionTitle.innerText = 'Keyboard Mappings';
    container.append(keySectionTitle);

    if (keyBindingsForControl.length > 0) {
      keyBindingsForControl.forEach((binding) => addRow(binding.code, binding));
    } else {
      appendNone();
    }
    
    const midiSectionTitle = document.createElement('h3');
    midiSectionTitle.innerText = 'MIDI Mappings';
    container.append(midiSectionTitle);
    
    if (midiBindingsForControl.length > 0) {
      midiBindingsForControl.forEach((binding) => addRow(`${binding.kind} ${binding.displayName}`, binding));
    } else {
      appendNone();
    }
  }

  private removeBinding(binding: ControlBinding): any {
    switch(binding.kind) {
      case 'Keyboard':
        this._keyBindings = this._keyBindings.filter(b => b !== binding);
        break;
      case 'ControlChange':
      case 'NoteOn':
      case 'NoteOff':
        this._midiBindings = this._midiBindings.filter(b => b !== binding);
        break;
    }

    this.notifyEditedControl();
    this.showMappingsOverlay();
  }
}

injectStyle('BindableControl', `
.control-binding-container {
  width: 360px;
  min-height: 200px;
  max-height: 400px;
  padding: 0 20px 16px 20px;
  position: relative;
  overflow: auto;
}

.control-binding-container-name {
  text-align: center;
  margin-bottom: 0;
}

.control-binding-container.align-center {
  text-align: center;
  justify-content: center;
  display: flex;
  flex-direction: column;
}

.control-binding-row {
  border: 1px solid #0000003c;
  border-radius: 2px;
  margin: 3px 6px;
  display: flex;
}

.control-binding-name {
  flex-grow: 1;
  margin: auto;
  margin-left: 6px;
}

.control-binding-remove-button {
  height: 14px;
  width: 14px;
  margin: auto;
  padding: 6px;
  opacity: 0.5;
}

.control-binding-remove-button:hover {
  opacity: 0.77;
}

.control-binding-none {
  text-align: center;
}
`);