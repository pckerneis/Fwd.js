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

    this.htmlElement.onclick = (event) => {
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

    if (shouldBeToggled) {
      this.htmlElement.classList.add('toggled');
    } else {
      this.htmlElement.classList.remove('toggled');
    }

    this.notify();
  }

  public get toggled(): boolean {
    return this._toggled;
  }

  private notify(): void {
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
  color: grey;
  user-select: none;
}

.toggle-button.toggled {
  border-color: #000000AA;
  color: black;
}
`);
