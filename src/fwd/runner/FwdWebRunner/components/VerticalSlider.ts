import { clamp } from "../../../core/utils/numbers";
import { injectStyle } from "../StyleInjector";

export class VerticalSlider {
  public readonly htmlElement: HTMLElement;

  public oninput: Function;

  private readonly trackElement: HTMLElement;
  private readonly preThumbElement: HTMLElement;
  private readonly thumbElement: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('vertical-slider');

    this.trackElement = document.createElement('div');
    this.trackElement.classList.add('vertical-slider-track');
    this.trackElement.tabIndex = 0;

    this.preThumbElement = document.createElement('div');
    this.preThumbElement.classList.add('vertical-slider-pre-thumb');

    this.thumbElement = document.createElement('div');
    this.thumbElement.classList.add('vertical-slider-thumb');

    this.htmlElement.append(this.trackElement);

    this.trackElement.append(
      this.preThumbElement,
      this.thumbElement);

    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    this.htmlElement.draggable = true;

    const focus = () => { this.trackElement.focus(); };
    const moveThumb = (event: MouseEvent) => {
      if (event.screenX === 0 && event.screenY === 0) { return; }
      const ratio = clamp(event.offsetY / this.trackElement.clientHeight, 0, 1);
      this.preThumbElement.style.height = ratio * 100 + '%';
      setTimeout(focus, 0);

      if (typeof this.oninput === 'function') {
        this.oninput(1.0 - ratio);
      }
    };

    this.thumbElement.style.pointerEvents = 'none';
    this.trackElement.style.pointerEvents = 'none';

    this.htmlElement.onmouseup = focus;
    this.htmlElement.ondrag = moveThumb;
    this.htmlElement.onmousedown = moveThumb;
    this.htmlElement.onmousedown = moveThumb;
    this.htmlElement.ondragstart = event => {
      event.dataTransfer.setDragImage(dragImage, 0, 0);
      moveThumb(event);
    }
  }
}

injectStyle('VerticalSlider', `
.vertical-slider {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: center;
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

.vertical-slider-track:focus  {
  background: #00000015;
  outline: 0;
}

.vertical-slider-thumb {
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25);
  background: #00000005;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  margin-left: -3px;
  flex-shrink: 0;
}
`);