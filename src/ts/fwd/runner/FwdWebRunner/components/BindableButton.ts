import { injectStyle } from '../StyleInjector';

export class BindableButton {
  public readonly htmlElement: HTMLElement;

  public action: Function;

  private _button: HTMLButtonElement;

  private _indicator: HTMLSpanElement;

  constructor(label: string) {
    this.htmlElement = this._button = document.createElement('button');
    this._button.classList.add('bindable-button');
    this.text = label;

    this._button.onclick = () => {
      if (this.action != null) {
        this.action();
      }
    }

    this._indicator = document.createElement('span');
    this._indicator.classList.add('indicator');
    // this._indicator.textContent = 'H';
    this._button.append(this._indicator);
  }

  public get text(): string { return this._button.innerText; }
  public set text(newLabel: string) { this._button.innerText = newLabel; }

  public get disabled(): boolean { return this._button.disabled; }
  public set disabled(disabled: boolean) { this._button.disabled = disabled; }
}

injectStyle(BindableButton.name, `
  .indicator {
    background: rgba(0, 0, 0, 0.3);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin: auto 0 auto 7px;
  }

  .bindable-button {
    display: flex;
    padding-right: 7px;
  }
`);