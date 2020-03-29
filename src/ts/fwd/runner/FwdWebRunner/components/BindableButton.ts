import { injectStyle } from '../StyleInjector';

export class BindableButton {
  public readonly htmlElement: HTMLElement;

  public action: Function;

  private _button: HTMLButtonElement;

  private _indicator: HTMLDivElement;

  constructor(label: string) {
    this.htmlElement = this._button = document.createElement('button');
    this._button.classList.add('bindable-button');
    this.text = label;

    this._button.onclick = () => {
      if (this.action != null) {
        this.action();
      }
    }

    this._indicator = document.createElement('div');
    this._indicator.classList.add('indicator');
    this._indicator.textContent = 'H';
    this._button.append(this._indicator);
  }

  public get text(): string { return this._button.innerText; }
  public set text(newLabel: string) { this._button.innerText = newLabel; }

  public get disabled(): boolean { return this._button.disabled; }
  public set disabled(disabled: boolean) { this._button.disabled = disabled; }
}

injectStyle(BindableButton.name, `
  .indicator {
    color: blue;
    background: red;
    width: 5px;
  }

  .bindable-button {
    display: flex;
  }
`);