import { injectStyle } from "../../../../runner/FwdWebRunner/StyleInjector";
import { Logger } from "../../../utils/Logger";
import { EditorElement } from "../../Editor";
import parentLogger from "../logger.components";
import { AudioMixerTrackGraph, AudioTrackElement } from "./AudioTrackElement";
import { FwdSoloGroup } from "./FwdSoloGroup";

type TrackElementsMap = Map<string, {mixerTrack: AudioTrackElement, label: HTMLDivElement}>;

const DBG = new Logger('AudioMixerElement', parentLogger);

export class AudioMixerElement implements EditorElement {
  public readonly outputNode: GainNode;

  public readonly htmlElement: HTMLDivElement;

  private readonly _tracksElement: HTMLDivElement;

  private readonly _trackElements: TrackElementsMap = new Map<string, {
    mixerTrack: AudioTrackElement,
    label: HTMLDivElement,
  }>();

  private soloGroup: FwdSoloGroup<AudioMixerTrackGraph>;

  constructor(public readonly audioContext: AudioContext) {
    DBG.debug('Create AudioMixerPanel');

    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-section');

    this._tracksElement = document.createElement('div');
    this._tracksElement.classList.add('mixer-section-tracks');
    this.htmlElement.append(this._tracksElement);

    this.soloGroup = new FwdSoloGroup<AudioMixerTrackGraph>();

    this.outputNode = audioContext.createGain();
  }

  public get mixerTracks(): AudioTrackElement[] {
    return Array.from(this._trackElements.values()).map(value => value.mixerTrack);
  }

  public getTrack(trackName: string): AudioTrackElement {
    const elements = this._trackElements.get(trackName);
    return elements == null ? null : elements.mixerTrack;
  }

  public addTrack(trackName: string): AudioTrackElement {
    const existingTrack = this.getTrack(trackName);

    if (existingTrack != null) {
      return null;
    }

    const mixerTrack = new AudioTrackElement(this.audioContext, trackName);
    this.soloGroup.add(mixerTrack.trackGraph);

    const label = document.createElement('div');
    label.title = trackName;
    const span = document.createElement('span');
    span.textContent = trackName;
    label.classList.add('mixer-section-label');
    label.append(span);

    const mixerSlot = document.createElement('div');
    mixerSlot.classList.add('mixer-section-slot');
    mixerSlot.append(mixerTrack.htmlElement, label);

    this._tracksElement.append(mixerSlot);

    this._trackElements.set(trackName, { label, mixerTrack });

    mixerTrack.trackGraph.outputNode.connect(this.outputNode);

    return mixerTrack;
  }

  public getOrAddTrack(trackName: string): AudioTrackElement {
    return this.getTrack(trackName) || this.addTrack(trackName);
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

injectStyle('AudioMixerElement', `
.mixer-section {
  display: flex;
  flex-direction: column;
  box-shadow: 1px 1px 4px #0000002c inset;
  background: #8080800a;
}

.mixer-section-tracks {
  display: flex;
  flex-direction: row;
  min-height: 80px;
  flex-grow: 1;
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
  width: 100%;
  user-select: none;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1px solid #00000010;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mixer-section-slot {
  display: flex;
  flex-direction: column;
  height: 100%;
}
`);
