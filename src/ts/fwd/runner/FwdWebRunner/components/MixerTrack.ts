import { injectStyle } from '../StyleInjector';
import { clamp } from '../../../core/utils/numbers';

export class MixerSection {
  public readonly htmlElement: HTMLDivElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-tracks-container');

    for (let i = 0; i < 4; ++i) {
      this.addTrack('track ' + i);
    }
  }

  addTrack(trackName: string) {
    const track = new MixerTrack(trackName);
    this.htmlElement.append(track.htmlElement);
  }
}

export class VerticalSlider {
  public readonly htmlElement: HTMLElement;

  private trackElement: HTMLElement;

  private preThumbElement: HTMLElement;
  private thumbElement: HTMLElement;
  private postThumbElement: HTMLElement;

  public oninput: Function;
  
  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('vertical-slider')

    this.trackElement = document.createElement('div');
    this.trackElement.classList.add('vertical-slider-track');
    this.trackElement.tabIndex = 0;

    this.preThumbElement = document.createElement('div');
    this.preThumbElement.classList.add('vertical-slider-pre-thumb');

    this.thumbElement = document.createElement('div');
    this.thumbElement.classList.add('vertical-slider-thumb');

    this.postThumbElement = document.createElement('div');
    this.postThumbElement.classList.add('vertical-slider-post-thumb');

    this.htmlElement.append(this.trackElement);
    
    this.trackElement.append(
      this.preThumbElement, 
      this.thumbElement);

    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    this.htmlElement.draggable = true;

    const focus = () => { this.trackElement.focus(); }
    const moveThumb = (event: MouseEvent) => {
      if (event.screenX === 0 && event.screenY === 0) { return; }
      const ratio = clamp(event.offsetY / this.trackElement.clientHeight, 0, 1);
      this.preThumbElement.style.height = ratio * 100 + '%';
      setTimeout(focus, 0);

      if (typeof this.oninput === 'function') {
        this.oninput();
      }
    }

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

export class MixerTrack {
  public readonly htmlElement: HTMLDivElement;

  public readonly label: HTMLSpanElement;
  public readonly volumeSlider: VerticalSlider;
  public readonly panSlider: HTMLInputElement;
  public readonly activeButton: HTMLInputElement;
  public readonly soloButton: HTMLInputElement;

  private readonly minGain = -180.0;
  private readonly maxGain = 6.0;

  constructor(public readonly trackName: string) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-track');

    this.panSlider = this.createRangeInput(0, -1, 1, 0.001);
    this.panSlider.classList.add('slider', 'mixer-track-pan-slider');

    this.volumeSlider = new VerticalSlider();
    this.volumeSlider.htmlElement.classList.add('mixer-track-volume-slider');

    this.activeButton = document.createElement('input');
    this.activeButton.type = 'checkbox';
    this.activeButton.checked = true;
    this.activeButton.classList.add('mixer-track-active-button');

    this.soloButton = document.createElement('input');
    this.soloButton.type = 'checkbox';
    this.soloButton.classList.add('mixer-track-solo-button');

    this.label = document.createElement('span');
    this.label.textContent = trackName;
    this.label.title = trackName;
    this.label.classList.add('mixer-track-label');

    this.htmlElement.append(
      this.panSlider,
      this.volumeSlider.htmlElement,
      this.soloButton,
      this.activeButton,
    //  this.label
    );
  }

  private createRangeInput(value: number, min: number, max: number, step: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'range';
    input.value = value.toString();
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    return input;
  }
}

injectStyle('MixerTrack', `
.mixer-tracks-container {
  display: flex;
  min-height: 150px;
  justify-content: stretch;
  box-shadow: 1px 1px 4px #0000002c inset;
}

.mixer-track {
  width: 50px;
  display: flex;
  flex-direction: column;
  padding: 3px;
  border: 1px solid #00000010;
}

.mixer-track-label {
  display: block;
  margin: 0;
  text-overflow: ellipsis;
  text-align: center;
  background: #0000001c;
  font-family: monospace;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 11px;
  width: 100%;
  user-select: none;
}

.mixer-track-pan-slider {
  width: 100%;
  height: 20px;
  -webkit-appearance: slider-vertical
}

.mixer-track-volume-slider {
  width: 100%;
  flex-grow: 1;
  min-height: 50px;
}

.mixer-track-active-button {
  width: 20px;
  height: 20px;
  margin: 3px auto;
}

.mixer-track-solo-button {
  width: 20px;
  height: 20px;
  margin: 3px auto;
}
`);

/*
input[type=range].mixer-track-volume-slider:focus {
  outline: none;
}
input[type=range].mixer-track-volume-slider::-webkit-slider-runnable-track {
  width: 20px;
  cursor: pointer;
  box-shadow: 1px 1px 4px #0000002c inset;
  background: #00000005;
  border: 0;
}
input[type=range].mixer-track-volume-slider::-webkit-slider-thumb {
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25);
  background: #00000005;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  -webkit-appearance: none;
}
input[type=range].mixer-track-volume-slider:focus::-webkit-slider-runnable-track {
  background: #00000015;
}
input[type=range].mixer-track-volume-slider:focus::-webkit-slider-thumb {
  border: 1px solid #00000080;
}
input[type=range].mixer-track-volume-slider::-moz-range-track {
  width: 100%;
  height: 8.8px;
  cursor: pointer;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.31), 0px 0px 1px rgba(13, 13, 13, 0.31);
  background: rgba(0, 0, 0, 0.07);
  border-radius: 6.9px;
  border: 0.2px solid #000101;
}
input[type=range].mixer-track-volume-slider::-moz-range-thumb {
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.55), 0px 0px 1px rgba(13, 13, 13, 0.55);
  border: 0.5px solid rgba(0, 0, 0, 0.21);
  height: 18px;
  width: 16px;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
}
input[type=range].mixer-track-volume-slider::-ms-track {
  width: 100%;
  height: 8.8px;
  cursor: pointer;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input[type=range].mixer-track-volume-slider::-ms-fill-lower {
  background: rgba(0, 0, 0, 0.07);
  border: 0.2px solid #000101;
  border-radius: 13.8px;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.31), 0px 0px 1px rgba(13, 13, 13, 0.31);
}
input[type=range].mixer-track-volume-slider::-ms-fill-upper {
  background: rgba(0, 0, 0, 0.07);
  border: 0.2px solid #000101;
  border-radius: 13.8px;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.31), 0px 0px 1px rgba(13, 13, 13, 0.31);
}
input[type=range].mixer-track-volume-slider::-ms-thumb {
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.55), 0px 0px 1px rgba(13, 13, 13, 0.55);
  border: 0.5px solid rgba(0, 0, 0, 0.21);
  height: 18px;
  width: 16px;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  height: 8.8px;
}
input[type=range].mixer-track-volume-slider:focus::-ms-fill-lower {
  background: rgba(0, 0, 0, 0.07);
}
input[type=range].mixer-track-volume-slider:focus::-ms-fill-upper {
  background: rgba(13, 13, 13, 0.07);
}
`);
*/