import { clamp } from "../../../core/utils/numbers";
import { injectStyle } from "../StyleInjector";

export class VerticalSlider {

  public readonly htmlElement: HTMLElement;

  public oninput: Function;

  private _value: number;

  private _isPressedElement: boolean;

  private readonly trackElement: HTMLElement;
  private readonly preThumbElement: HTMLElement;
  private readonly thumbElement: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('vertical-slider');
    // We need this for focus
    this.htmlElement.tabIndex = 0;

    this.trackElement = document.createElement('div');
    this.trackElement.classList.add('vertical-slider-track');

    this.preThumbElement = document.createElement('div');
    this.preThumbElement.classList.add('vertical-slider-pre-thumb');

    this.thumbElement = document.createElement('div');
    this.thumbElement.classList.add('vertical-slider-thumb');

    this.htmlElement.append(this.trackElement);

    this.trackElement.append(
      this.preThumbElement,
      this.thumbElement);

    const focus = () => { this.htmlElement.focus(); };

    const moveThumb = (event: MouseEvent) => {
      const bounds = this.trackElement.getBoundingClientRect();
      const relativeMouseY = event.clientY - bounds.top - this.thumbElement.getBoundingClientRect().height / 2;
      const ratio = clamp(relativeMouseY / this.trackElement.clientHeight, 0, 1);
      this.setValue(1.0 - ratio, true);

      event.stopPropagation();
      event.preventDefault();

      setTimeout(focus);
    };

    this.thumbElement.style.pointerEvents = 'none';
    this.trackElement.style.pointerEvents = 'none';
    this.preThumbElement.style.pointerEvents = 'none';

    this.htmlElement.addEventListener('mouseup', () => {
      if (this._isPressedElement) {
        this._isPressedElement = false;
        focus();
      }
    });

    this.htmlElement.addEventListener('mousedown', (event) => {
      this._isPressedElement = true;
      moveThumb(event);

      const windowMousemoveListener = (moveEvent: MouseEvent) => {
        if (moveEvent.buttons === 1 && this._isPressedElement) {
          moveThumb(moveEvent);
        }
      };

      const windowMouseupListener = () => {
        this._isPressedElement = false;
        document.removeEventListener('mouseup', () => windowMouseupListener());
        document.removeEventListener('mousemove', (moveEvent) => windowMousemoveListener(moveEvent));
      };

      document.addEventListener('mouseup', windowMouseupListener);
      document.addEventListener('mousemove', windowMousemoveListener);
    }, true);
  }

  public get value(): number {
    return this._value;
  }

  public setValue(newValue: number, notify: boolean): void {
    newValue = clamp(newValue, 0, 1);

    if (this._value === newValue) {
      return;
    }

    this._value = newValue;
    this.preThumbElement.style.height = (1.0 - this._value) * 100 + '%';

    if (notify && typeof this.oninput === 'function') {
      this.oninput(newValue);
    }
  }
}

injectStyle('VerticalSlider', `
.vertical-slider {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: center;
  padding: 5px;
  box-sizing: border-box;
}

.vertical-slider-track {
  width: 10px;
  cursor: pointer;
  box-shadow: 1px 1px 4px #0000002c inset;
  background: #00000005;
  border: 0;
  border-radius: 3px;
  flex-grow: 1;

  display: flex;
  flex-direction: column;
}

.vertical-slider:focus .vertical-slider-track  {
  background: #00000015;
}

.vertical-slider-thumb {
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25);
  background: #00000005;
  height: 10px;
  width: 10px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  flex-shrink: 0;
}
`);
