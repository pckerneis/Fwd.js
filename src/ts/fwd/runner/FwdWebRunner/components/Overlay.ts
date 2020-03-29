import { injectStyle } from '../StyleInjector';

export class Overlay {
  public readonly container: HTMLElement;

  private _backdrop: HTMLDivElement;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.classList.add('overlay-container');

    this._backdrop = document.createElement('div');
    this._backdrop.classList.add('overlay-backdrop');

    this._backdrop.append(this.container);

    this._backdrop.addEventListener('click', () => {
      this.hide();
    });

    this.container.addEventListener('click', (evt) => {
      evt.stopPropagation();
    });
  }

  public show() {
    document.body.append(this._backdrop);
  }

  public hide() {
    this._backdrop.remove();
  }
}

injectStyle('Overlay', `
.overlay-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #00000088;
  box-shadow: 0 0 11px 0 #00000036;
}

.overlay-container {
  background: rgb(229, 230, 231);
  min-width: 100px;
  min-height: 100px;
  position: relative;
  margin: auto;
  border-radius: 2px;
}
`);