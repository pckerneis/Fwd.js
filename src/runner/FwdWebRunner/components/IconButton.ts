import { injectStyle } from "../StyleInjector";

export class IconButton {
  public readonly htmlElement: HTMLButtonElement;
  private _objectElement: HTMLObjectElement;

  constructor(iconName: string) {
    const button = document.createElement('button');
    button.classList.add('fwd-icon-button');

    this.htmlElement = button;

    this.iconName = iconName;
  }

  private static createSvgObject(): HTMLObjectElement {
    const object = document.createElement('object');
    object.type = 'image/svg+xml';
    return object;
  }

  public set iconName(iconName: string) {
    const newObject = IconButton.createSvgObject();
    newObject.data = `img/${iconName}.svg`;

    if (this._objectElement != null) {
      this.htmlElement.replaceChild(newObject, this._objectElement);
    } else {
      this.htmlElement.append(newObject);
    }

    this._objectElement = newObject;
  }
}

injectStyle('IconButton', `
.fwd-icon-button {
  padding: 5px;
  opacity: 0.6;
  background: transparent;
  border: none;
  margin: auto 0;
  overflow: hidden;
  height: 1.7rem;
  width: 1.7rem;
  display: flex;
}

.fwd-icon-button:hover {
  opacity: 1;
}

.fwd-icon-button object {
  height: 100%;
  pointer-events: none;
}
`);
