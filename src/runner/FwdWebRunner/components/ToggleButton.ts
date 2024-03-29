import { injectStyle } from "../StyleInjector";

export class ToggleButton {
  public readonly htmlElement: HTMLDivElement;

  public oninput: Function;

  private readonly _spanElement: HTMLSpanElement;

  private _toggled: boolean = false;

  constructor(text: string) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('toggle-button');
    this._spanElement = document.createElement('span');
    this.htmlElement.append(this._spanElement);

    this.text = text;

    this.htmlElement.onclick = (/* event */) => {
      this.toggled = ! this._toggled;
    }
  }

  public set text(newText: string) {
    this._spanElement.innerText = newText;
  }

  public get text(): string {
    return this._spanElement.innerText;
  }

  public set toggled(shouldBeToggled: boolean) {
    if (shouldBeToggled === this._toggled) {
      return;
    }

    this._toggled = shouldBeToggled;
    this._updateClasses();

    this._notify();
  }

  public get toggled(): boolean {
    return this._toggled;
  }

  public setToggled(shouldBeToggled: boolean, sendNotification: boolean): void {
    if (this._toggled === shouldBeToggled) {
      return;
    }

    this._toggled = shouldBeToggled;
    this._updateClasses();

    if (sendNotification) {
      this._notify();
    }
  }

  private _updateClasses(): void {
    if (this._toggled) {
      this.htmlElement.classList.add('toggled');
    } else {
      this.htmlElement.classList.remove('toggled');
    }
  }

  private _notify(): void {
    if (typeof this.oninput === 'function') {
      this.oninput();
    }
  }
}

injectStyle('ToggleButton', `
.toggle-button {
  display: flex;
  justify-content: center;
  border: 1px solid #00000050;
  border-radius: 2px; 
  align-items: center;
  cursor: pointer;
  user-select: none;
  opacity: 0.7;
}

.toggle-button.toggled {
  border-color: #000000AA;
  opacity: 1;
}
`);
