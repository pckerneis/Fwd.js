import { FwdAudioTrack } from "../../../audio/Audio";
import { injectStyle } from "../StyleInjector";
import { TRACK_SECTION_HEIGHT, TRACK_WIDTH } from "./MixerSection.constants";
import { MixerTrack } from "./MixerTrack";

type TrackElementsMap = Map<string, {mixerTrack: MixerTrack, label: HTMLDivElement}>;

export class MixerSection {
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
  min-height: ${TRACK_SECTION_HEIGHT}px;
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
  width: ${TRACK_WIDTH}px;
  user-select: none;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1px solid #00000010;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
`);