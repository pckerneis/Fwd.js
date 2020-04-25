import webmidi, { InputEventControlchange, InputEventNoteon } from 'webmidi';
import { injectStyle } from '../StyleInjector';
import { Overlay } from './Overlay';

export type ControllerKind = 'button' | 'slider';

export interface BindableController {
  controllerId: number;
  controllerName: string;
  controllerKind: string;

  controlElement: HTMLElement;
  active: boolean;

  acceptsBinding(binding: ControlBinding): boolean;

  setBindingMode(bindingMode: boolean): void;
  setBindings(bindings: ControlBinding[]): void;

  triggerKeyAction(sourceBinding: KeyBinding): void;
  handleNoteOn(noteNumber: number, velocity: number, channel: number, deviceId: string): void;
  handleControlChange(value: number, ccNumber: number, channel: number, deviceId: string): void;
}

export interface KeyBinding {
  kind: 'KeyPress',
  code: string,
  controlId: number;
}

export interface DeviceID {
  id: string;
  name: string;
  index: number;
  manufacturer?: string;
}

export type MIDIBindingKind = 'NoteOn' | 'NoteOff' | 'ControlChange';

export interface MIDIBinding {
  controlId: number;
  kind: MIDIBindingKind;
  noteNumber?: number;
  ccNumber?: number;
  displayName: string;
  deviceId: string; // DeviceID;
  midiChanel: number;
}

export type ControlBinding = KeyBinding | MIDIBinding;

let controlBindingManager: ControlBindingManager = null;

interface KnownController {
  id: number;
  name: string;
  controllerKind: string;
  midiBindings: MIDIBinding[];
  keyBindings: KeyBinding[];
}

export class ControlBindingManager {
  private _keyBindings: KeyBinding[] = [];

  private _midiBindings: MIDIBinding[] = [];

  private _controlBeingEdited: BindableController = null;

  private readonly _overlay: Overlay;

  private _latestControllerId: number = 0;

  private _knownControllers: KnownController[] = [];

  private _currentControllers: BindableController[] = [];

  private constructor() {
    document.addEventListener('keydown', (evt) => this.handleKeyDown(evt.code));
    this._overlay = new Overlay();
    this.watchIncomingMidi();

    this.loadState();
  }

  public static getInstance(): ControlBindingManager {
    if (controlBindingManager === null) {
      controlBindingManager = new ControlBindingManager();
    }

    return controlBindingManager;
  }

  public setControlBeingEdited(control: BindableController): void {
    if (this._controlBeingEdited !== null) {
      this._controlBeingEdited.setBindingMode(false);
    }

    this._controlBeingEdited = control;
    this.showMappingsOverlay();
  }

  public registerController(control: BindableController): void {
    const matchingKnownControllers: KnownController[] = this._knownControllers.filter(known => {
      return known.name === control.controllerName && known.controllerKind === control.controllerKind;
    });

    if (matchingKnownControllers.length === 0) {
      control.controllerId = this._latestControllerId++;
      this._knownControllers.push({
        controllerKind: control.controllerKind,
        id: control.controllerId,
        keyBindings: [],
        midiBindings: [],
        name: control.controllerName,
      });
    } else {
      control.controllerId = matchingKnownControllers[0].id;
      this._keyBindings.push(...matchingKnownControllers[0].keyBindings);
      this._midiBindings.push(...matchingKnownControllers[0].midiBindings);
      this.notifyControl(control);
    }
    
    this._currentControllers.push(control);
  }

  public clearCurrentControllers(): void {
    this._currentControllers = [];
    this._keyBindings = [];
    this._midiBindings = [];
  }

  private registerBinding(binding: ControlBinding): void {
    this._knownControllers
      .filter(known => known.id === binding.controlId)
      .forEach(known => {
        if (binding.kind === 'KeyPress') {
          known.keyBindings.push(binding);
        } else {
          known.midiBindings.push(binding);
        }
      });

    this.saveStateOnIdle();
  }

  private removeRegisteredBinding(binding: ControlBinding): void {
    this._knownControllers.forEach((known: KnownController) => {
      known.midiBindings = known.midiBindings.filter(b => binding != b);
      known.keyBindings = known.keyBindings.filter(b => binding != b);
    });

    this.saveStateOnIdle();
  }

  private notifyControl(control: BindableController): void {
    const bindingsForControl = [...this._keyBindings, ...this._midiBindings]
        .filter(binding => binding.controlId === control.controllerId);

    control.setBindings(bindingsForControl);
  }

  //=======================================================================================

  private saveStateOnIdle(): void {
    (window as any).requestIdleCallback(() => {
      const state = {
        known: this._knownControllers,
      };

      localStorage.setItem('fwd-runner-state', JSON.stringify(state));
    });
  }

  private loadState(): void {
    const state = JSON.parse(localStorage.getItem('fwd-runner-state'));

    console.log('Loading state', state);

    if (state != null && state.known != null) {
      this._knownControllers = state.known;

      for(const known of this._knownControllers.values()) {
        this._latestControllerId = Math.max(known.id + 1, this._latestControllerId);
      }
    }
  }

  private showMappingsOverlay(): void {
    if (this._controlBeingEdited !== null) {
      const control = this._controlBeingEdited;
      control.setBindingMode(true);

      this.buildMappingsOverlay();

      this._overlay.show();

      this._overlay.onclose = () => {
        control.setBindingMode(false);
        this._controlBeingEdited = null;
      }
    }
  }

  private handleKeyDown(code: string): void {
    if (this._controlBeingEdited !== null) {
      if (code === 'Escape') {
        this._controlBeingEdited.setBindingMode(false);
        this._controlBeingEdited = null;
        return;
      }

      this.addKeyBinding(this._controlBeingEdited, code);
    } else {
      this.dispatchKeyEvent(code);
    }
  }

  private addKeyBinding(control: BindableController, code: string): void {
    const newBinding = { 
      controlId: control.controllerId, 
      code, 
      kind: 'KeyPress',
    } as KeyBinding;
    
    if (! control.acceptsBinding(newBinding)) {
      return;
    }

    const existingBinding = this.getKeyBinding(control, code);

    if (existingBinding === null) {
      this._keyBindings.push(newBinding);

      this.notifyControl(control);
      this.showMappingsOverlay();
      this.registerBinding(newBinding);
    }
  }

  private getKeyBinding(control: BindableController, code: string): KeyBinding {
    const results = this._keyBindings.filter((binding) => {
      return binding.code === code && binding.controlId === control.controllerId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchKeyEvent(code: string): void {
    const bindings = this._keyBindings.filter((binding) => binding.code === code);
    bindings.forEach((binding) => {
      const control = this.findController(binding.controlId);
      if (control.active) {
        control.triggerKeyAction(binding);
      }
    });
  }

  //=======================================================================================

  private watchIncomingMidi(): void {
    webmidi.enable((err) => {

      if (err) console.error(err);

      webmidi.inputs.forEach((input) => {
        input.addListener('noteon', 'all', (event) => this.handleNoteOn(event));
        input.addListener('controlchange', 'all', (event) => this.handleControlChange(event));
      });
    });
  }

  private handleNoteOn(noteOn: InputEventNoteon): void {
    if (this._controlBeingEdited !== null) {
      const deviceId = noteOn.target.id;
      const noteNumber = noteOn.note.number;
      const channel = noteOn.channel;
      const existingBinding = this.getNoteOnBinding(this._controlBeingEdited, deviceId, noteNumber, channel);
   
      if (existingBinding == null) {
        const newBinding = {
          deviceId,
          kind: 'NoteOn',
          midiChanel: channel,
          noteNumber,
          controlId: this._controlBeingEdited.controllerId,
          displayName: `${noteOn.note.number} (${noteOn.note.name})`,
        } as MIDIBinding;

        if (! this._controlBeingEdited.acceptsBinding(newBinding)) {
          return;
        }

        this._midiBindings.push(newBinding);

        this.notifyControl(this._controlBeingEdited);
        this.showMappingsOverlay();
        this.registerBinding(newBinding);
      }
    } else {
      this.dispatchNoteOn(noteOn);
    }
  }
  
  private getNoteOnBinding(control: BindableController, deviceId: string, noteNumber: number, channel: number): MIDIBinding {
    const results = this._midiBindings.filter(binding => {
      return binding.kind === 'NoteOn'
        && binding.controlId === control.controllerId
        && binding.midiChanel === channel
        && binding.noteNumber === noteNumber
        && binding.deviceId === deviceId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchNoteOn(event: InputEventNoteon): void {
    this._midiBindings
      .filter((binding) => binding.kind === 'NoteOn' 
                        && binding.deviceId === event.target.id 
                        && binding.midiChanel === event.channel
                        && binding.noteNumber === event.note.number)
      .forEach((binding) => {
        this.findController(binding.controlId)
            .handleNoteOn(event.note.number, event.velocity, event.channel, event.target.id);
      });
  }

  private handleControlChange(controlChange: InputEventControlchange): void {
    if (this._controlBeingEdited !== null) {
      const deviceId = controlChange.target.id;
      const ccNumber = controlChange.controller.number;
      const channel = controlChange.channel;
      const existingBinding = this.getControlChangeBinding(this._controlBeingEdited, deviceId, ccNumber, channel);
   
      if (existingBinding == null) {
        const newBinding = {
          deviceId,
          kind: 'ControlChange',
          midiChanel: channel,
          ccNumber,
          controlId: this._controlBeingEdited.controllerId,
          displayName: `${controlChange.controller.number} (${controlChange.controller.name})`,
        } as MIDIBinding;

        if (! this._controlBeingEdited.acceptsBinding(newBinding)) {
          return;
        }

        this._midiBindings.push(newBinding);

        this.notifyControl(this._controlBeingEdited);
        this.showMappingsOverlay();
        this.registerBinding(newBinding);
      }
    } else {
      this.dispatchControlChange(controlChange);
    }
  }
  
  private getControlChangeBinding(control: BindableController, deviceId: string,
                                  ccNumber: number, channel: number): MIDIBinding {
    const results = this._midiBindings.filter(binding => {
      return binding.kind === 'ControlChange'
        && binding.controlId === control.controllerId
        && binding.midiChanel === channel
        && binding.ccNumber === ccNumber
        && binding.deviceId === deviceId;
    });

    return results.length > 0 ? results[0] : null;
  }

  private dispatchControlChange(event: InputEventControlchange): void {
    this._midiBindings
      .filter((binding) => binding.kind === 'ControlChange'
                        && binding.deviceId === event.target.id 
                        && binding.midiChanel === event.channel
                        && binding.ccNumber === event.controller.number)
      .forEach((binding) => {
        this.findController(binding.controlId)
            .handleControlChange(event.value, event.controller.number, event.channel, event.target.id);
      });
  }

  private findController(controllerId: number): BindableController {
    const results = this._currentControllers.filter(current => current.controllerId === controllerId);
    return results.length > 0 ? results[0] : null;
  }
  
  private buildMappingsOverlay(): void {
    const control = this._controlBeingEdited;
    const controlTop = control.controlElement.getBoundingClientRect().top;
    const controlIsInUpperHalf = controlTop < window.innerHeight / 2;

    if (controlIsInUpperHalf) {
      this._overlay.container.classList.add('bottom');
      this._overlay.container.classList.remove('top');
    } else {
      this._overlay.container.classList.add('top');
      this._overlay.container.classList.remove('bottom');
    }

    this._overlay.focusOnElement(control.controlElement);

    this._overlay.container.innerHTML = '';

    const title = document.createElement('h2');
    title.innerHTML = `Edit mappings for <code>${control.controllerName}</code>`;
    title.classList.add('control-binding-container-name');
    this._overlay.container.append(title);

    const container = document.createElement('div');
    container.classList.add('control-binding-container');
    this._overlay.container.append(container);
    
    const keyBindingsForControl = this._keyBindings.filter(binding => binding.controlId === control.controllerId);
    const midiBindingsForControl = this._midiBindings.filter(binding => binding.controlId === control.controllerId);

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
    };

    const appendNone = () => {
      const p = document.createElement('p');
      p.innerText = '(none)';
      p.style.textAlign = 'center';
      container.append(p);
    };

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
      case 'KeyPress':
        this._keyBindings = this._keyBindings.filter(b => b !== binding);
        break;
      case 'ControlChange':
      case 'NoteOn':
      case 'NoteOff':
        this._midiBindings = this._midiBindings.filter(b => b !== binding);
        break;
    }

    this.notifyControl(this.findController(binding.controlId));
    this.showMappingsOverlay();
    this.removeRegisteredBinding(binding);
  }
}

injectStyle('BindableController', `
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

.overlay-container.top {
  transform: translate(0, -60%);
}

.overlay-container.bottom {
  transform: translate(0, 50%);
}
`);