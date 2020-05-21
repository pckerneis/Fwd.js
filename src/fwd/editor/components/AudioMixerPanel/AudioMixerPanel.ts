import { TRACK_SECTION_HEIGHT, TRACK_WIDTH } from "../../../runner/FwdWebRunner/components/MixerSection.constants";
import { injectStyle } from "../../../runner/FwdWebRunner/StyleInjector";
import { Logger } from "../../../utils/dbg";
import parentLogger from "../logger.components";
import { AudioMixerTrack, AudioMixerTrackGraph } from "./AudioMixerTrack";
import { FwdSoloGroup } from "./FwdSoloGroup";

type TrackElementsMap = Map<string, {mixerTrack: AudioMixerTrack, label: HTMLDivElement}>;

const DBG = new Logger('AudioMixerPanel', parentLogger);

export class AudioMixerPanel {
  public readonly outputNode: GainNode;

  public readonly htmlElement: HTMLDivElement;

  private readonly _tracksElement: HTMLDivElement;
  private readonly _labelsElement: HTMLDivElement;

  private readonly _trackElements: TrackElementsMap = new Map<string, {
    mixerTrack: AudioMixerTrack,
    label: HTMLDivElement,
  }>();

  private soloGroup: FwdSoloGroup<AudioMixerTrackGraph>;

  constructor(public readonly audioContext: AudioContext) {
    DBG.debug('Create AudioMixerPanel');

    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-section');

    this._tracksElement = document.createElement('div');
    this._tracksElement.classList.add('mixer-section-tracks');

    this._labelsElement = document.createElement('div');
    this._labelsElement.classList.add('mixer-section-labels');

    this.htmlElement.append(this._tracksElement, this._labelsElement);

    this.soloGroup = new FwdSoloGroup<AudioMixerTrackGraph>();

    this.outputNode = audioContext.createGain();
  }

  public get mixerTracks(): AudioMixerTrack[] {
    return Array.from(this._trackElements.values()).map(value => value.mixerTrack);
  }

  public getTrack(trackName: string): AudioMixerTrack {
    const elements = this._trackElements.get(trackName);
    return elements == null ? null : elements.mixerTrack;
  }

  public addTrack(trackName: string): AudioMixerTrack {
    const existingTrack = this.getTrack(trackName);

    if (existingTrack != null) {
      return existingTrack;
    }

    const mixerTrack = new AudioMixerTrack(this.audioContext, trackName);
    this.soloGroup.add(mixerTrack.trackGraph);
    this._tracksElement.append(mixerTrack.htmlElement);

    const label = document.createElement('div');
    label.title = trackName;
    const span = document.createElement('span');
    span.textContent = trackName;
    label.classList.add('mixer-section-label');
    label.append(span);
    this._labelsElement.append(label);

    this._trackElements.set(trackName, { label, mixerTrack });

    mixerTrack.trackGraph.outputNode.connect(this.outputNode);

    return mixerTrack;
  }

  public removeTrack(trackName: string): void {
    const elements = this._trackElements.get(trackName);

    if (elements == null) {
      DBG.warn(`The track cannot be removed because it doesn't exist.`, trackName);
      return;
    }

    if (elements.mixerTrack !== null) {
      elements.mixerTrack.htmlElement.remove();
    }

    if (elements.label !== null) {
      elements.label.remove();
    }

    this._trackElements.delete(trackName);
    DBG.info('Track removed', trackName);
  }

  public clearTracks(): void {
    this._trackElements.forEach(({mixerTrack}) => {
      this.removeTrack(mixerTrack.trackName);
    });
    DBG.info('Tracks cleared');
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
