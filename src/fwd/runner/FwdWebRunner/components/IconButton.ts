import { injectStyle } from "../StyleInjector";

export class IconButton {
  public readonly htmlElement: HTMLButtonElement;

  private readonly _objectElement: HTMLObjectElement;

  constructor(iconName: string) {
    const button = document.createElement('button');
    button.classList.add('fwd-icon-button');
    this._objectElement = document.createElement('object');
    this._objectElement.type = 'image/svg+xml';

    button.append(this._objectElement);
    this.htmlElement = button;

    this.iconName = iconName;
  }

  public set iconName(iconName: string) {
    this._objectElement.data = `img/${iconName}.svg`;
  }
}

injectStyle('IconButton', `
.fwd-icon-button {
  height: 100%;
  padding: 6px;
  opacity: 0.6;
  background: transparent;
  border: none;
}

.fwd-icon-button:hover {
  opacity: 1;
}

.fwd-icon-button object {
  height: 100%;
  pointer-events: none;
}
`);
