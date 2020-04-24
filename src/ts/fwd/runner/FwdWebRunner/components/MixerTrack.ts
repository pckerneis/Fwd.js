import { FwdAudioTrack } from '../../../audio/Audio';
import { clamp } from '../../../core/utils/numbers';
import { injectStyle } from '../StyleInjector';

type TrackElementsMap = Map<string, {mixerTrack: MixerTrack, label: HTMLDivElement}>;

export class MixerSection {

  public static TRACK_WIDTH: number = 70;
  public static TRACK_SECTION_HEIGHT: number = 200;
  public readonly htmlElement: HTMLDivElement;

  private readonly _tracksElement: HTMLDivElement;
  private readonly _labelsElement: HTMLDivElement;

  private readonly _trackElements: TrackElementsMap = new Map<string, {mixerTrack: MixerTrack, label: HTMLDivElement}>();

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-section');

    this._tracksElement = document.createElement('div');
    this._tracksElement.classList.add('mixer-section-tracks');

    this._labelsElement = document.createElement('div');
    this._labelsElement.classList.add('mixer-section-labels');

    this.htmlElement.append(this._tracksElement, this._labelsElement);
  }

  public addTrack(track: FwdAudioTrack): void {
    const mixerTrack = new MixerTrack(track);
    this._tracksElement.append(mixerTrack.htmlElement);

    const label = document.createElement('div');
    label.title = track.trackName;
    const span = document.createElement('span');
    span.textContent = track.trackName;
    label.classList.add('mixer-section-label');
    label.append(span);
    this._labelsElement.append(label);

    mixerTrack.onvolumechange = (value: number) => {
      track.gain = value;
    };

    this._trackElements.set(track.trackName, { label, mixerTrack });
  }

  public removeTrack(track: FwdAudioTrack): void {
    const elements = this._trackElements.get(track.trackName);

    if (elements == null) {
      return;
    }
    
    if (elements.mixerTrack !== null) {
      elements.mixerTrack.htmlElement.remove();
    }

    if (elements.label !== null) {
      elements.label.remove();
    }

    this._trackElements.delete(track.trackName);
  }

  public clearTracks(): void {
    this._trackElements.forEach(({mixerTrack}) => {
      this.removeTrack(mixerTrack.audioTrack);
    });
  }
}

injectStyle('MixerSection', `
.mixer-section {
  display: flex;
  flex-direction: column;
  box-shadow: 1px 1px 4px #0000002c inset;
}

.mixer-section-tracks {
  display: flex;
  flex-direction: row;
  min-height: ${MixerSection.TRACK_SECTION_HEIGHT}px;
  flex-grow: 1;
  justify-content: stretch;
}

.mixer-section-labels {
  display: flex;
  height: 20px;
  justify-content: stretch;
}

.mixer-section-label {
  display: block;
  margin: 0;
  text-align: center;
  background: #0000001c;
  font-family: monospace;
  padding: 0;
  overflow: hidden;
  font-size: 11px;
  width: ${MixerSection.TRACK_WIDTH}px;
  user-select: none;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1px solid #00000010;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
`);

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

export class MixerTrack {
  public readonly htmlElement: HTMLDivElement;

  public readonly volumeSlider: VerticalSlider;
  public readonly panSlider: HTMLInputElement;
  public readonly activeButton: HTMLInputElement;
  public readonly soloButton: HTMLInputElement;

  public onvolumechange: Function;

  constructor(public readonly audioTrack: FwdAudioTrack) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-track');

    this.panSlider = MixerTrack.createRangeInput(0, -1, 1, 0.001);
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

    this.htmlElement.append(
      this.panSlider,
      this.volumeSlider.htmlElement,
      this.soloButton,
      this.activeButton,
    );

    
    this.volumeSlider.oninput = (value: number) => {
      if (typeof this.onvolumechange === 'function') {
        this.onvolumechange(value);
      }
    };
  }

  private static createRangeInput(value: number, min: number, max: number, step: number): HTMLInputElement {
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
.mixer-track {
  width: ${MixerSection.TRACK_WIDTH}px;
  display: flex;
  flex-direction: column;
  padding: 3px;
  border: 1px solid #00000010;
  box-sizing: border-box;
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
