import { darkTheme, defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';

export class Overlay {
  public readonly container: HTMLElement;

  public onclose: Function;

  private readonly _backdrop: HTMLDivElement;

  private readonly _shadowElement: HTMLDivElement;

  constructor(public options?: { hideWhenContainerClicked: boolean, hideWhenBackdropClicked: boolean }) {
    this._shadowElement = document.createElement('div');
    this._shadowElement.classList.add('overlay-shadow-element', 'hidden');

    this.container = document.createElement('div');
    this.container.classList.add('overlay-container');

    this._backdrop = document.createElement('div');
    this._backdrop.classList.add('overlay-backdrop');
    this._backdrop.append(this._shadowElement, this.container);

    this._backdrop.addEventListener('click', () => {
      if (this.options?.hideWhenBackdropClicked)
        this.hide();
    });

    this.container.addEventListener('click', (evt) => {
      if (this.options?.hideWhenContainerClicked)
        this.hide();

      evt.stopPropagation();
    });
  }

  public get backdrop(): HTMLDivElement { return this._backdrop; }

  public show(): void {
    document.body.append(this._backdrop);
  }

  public hide(): void {
    if (this._backdrop.isConnected) {
      this._backdrop.remove();

      if (this.onclose !== null && typeof this.onclose === 'function')
        this.onclose();
    }
  }

  public focusOnElement(element: HTMLElement): void {
    if (element == null) {
      this._backdrop.classList.remove('hidden');
      this._shadowElement.classList.add('hidden');
    } else {
      this.backdrop.classList.add('hidden');
      this._shadowElement.classList.remove('hidden');
      const bounds = element.getBoundingClientRect();
      this._shadowElement.style.top = bounds.top + 'px';
      this._shadowElement.style.left = bounds.left + 'px';
      this._shadowElement.style.width = bounds.right - bounds.left + 'px';
      this._shadowElement.style.height = bounds.bottom - bounds.top + 'px';
    }
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
  overflow: hidden;
  z-index: 10;
}


.overlay-backdrop.hidden {
  background: none;
}

.overlay-container {
  background: ${defaultTheme.bgSecondary};
  position: relative;
  margin: auto;
  border-radius: 2px;
}

.fwd-runner-dark-mode .overlay-container {
  background: ${darkTheme.bgSecondary};
}

.overlay-shadow-element {
  position: absolute;
  box-shadow: 0 0 0 9999px #00000050;
}

.overlay-shadow-element.hidden {
  opacity: 0;
}
`);
