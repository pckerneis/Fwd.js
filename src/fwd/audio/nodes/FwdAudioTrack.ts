import { decibelsToGain, gainToDecibels } from "../../core/utils/decibels";
import { clamp } from "../../core/utils/numbers";
import { FwdAudio } from "../FwdAudio";
import { FwdAudioNode } from "./FwdAudioNode";
import { FwdAudioParamWrapper } from "./StandardAudioNodes";

const DBG = (...messages: string[]) => console.log(...messages);

export interface FwdAudioTrackListener {
  onTrackMute: Function,
  onTrackUnmute: Function,
  onTrackSolo: Function,
  onTrackUnsolo: Function,
}

export class FwdAudioTrack extends FwdAudioNode {

  public readonly listeners: FwdAudioTrackListener[] = [];

  private _audioReady: boolean = false;
  private _tornDown: boolean = false;

  private _muteForSoloGainNode: GainNode;
  private _muteGainNode: GainNode;
  private _panNode: StereoPannerNode;
  private _postGainNode: GainNode;

  constructor(public readonly fwdAudio: FwdAudio, public readonly trackName: string) {
    super();

    if (this.fwdAudio.isContextReady) {
      this.prepareAudio();
    } else {
      this.fwdAudio.listeners.push({
        audioContextStarted: () => this.prepareAudio(),
        audioTrackAdded: () => {},
        audioTrackRemoved: () => {},
      });
    }
  }

  public get inputNode(): AudioNode { return this._muteForSoloGainNode; }
  public get outputNode(): AudioNode { return this._panNode; }

  public get audioIsReady(): boolean { return this._audioReady; }
  public get wasTornDown(): boolean { return this._tornDown; }

  public get gain(): number {
    this.assertReady();
    return this._postGainNode.gain.value;
  }

  public set gain(value: number) {
    this.assertNotTornDown();
    const clamped = clamp(value, 0, 1);
    this.setValueSmoothed(this._postGainNode.gain, clamped);
  }

  public get volume(): number {
    this.assertReady();
    return gainToDecibels(this._postGainNode.gain.value);
  }

  public set volume(dB: number) {
    this.gain = decibelsToGain(dB);
  }

  public set pan(value: number) {
    this.assertReady();
    const clamped = clamp(value, -1, 1);
    this.setValueSmoothed(this._panNode.pan, clamped);
  }

  public solo(): void {
    this.assertReady();
    this.fwdAudio.soloTrack(this.trackName);
  }

  public unsolo(): void {
    this.assertReady();
    // this.fwdAudio.unsoloTrack(this.trackName)
    // TODO: replace with previous line when multi-soloing is implemented
    this.fwdAudio.unsoloAllTracks();
  }

  public mute(): void {
    this.setValueSmoothed(this._postGainNode.gain, 0);
    this.listeners.forEach((l) => l.onTrackMute());
  }

  public unmute(): void {
    this.setValueSmoothed(this._postGainNode.gain, 1);
    this.listeners.forEach((l) => l.onTrackUnmute());
  }

  public tearDown(): void {
    this.assertReady();

    this._muteForSoloGainNode.disconnect();
    this._muteGainNode.disconnect();
    this._panNode.disconnect();
    this._postGainNode.disconnect();

    this._tornDown = true;
  }

  //=========================================================================

  private prepareAudio(): void {
    if (this._audioReady) {
      return;
    }

    this._muteForSoloGainNode = this.fwdAudio.context.createGain();
    this._muteGainNode = this.fwdAudio.context.createGain();
    this._panNode = this.fwdAudio.context.createStereoPanner();
    this._postGainNode = this.fwdAudio.context.createGain();

    this._muteForSoloGainNode.gain.value = 1;
    this._muteGainNode.gain.value = 1;
    this._postGainNode.gain.value = 1;

    this._muteForSoloGainNode
      .connect(this._muteGainNode)
      .connect(this._postGainNode)
      .connect(this._panNode)
      .connect(this.fwdAudio.master.nativeNode);

    this._audioReady = true;
  }

  private _muteForSolo(): void {
    DBG('mute for solo');
    this.setValueSmoothed(this._muteForSoloGainNode.gain, 0);
  }

  private _unmuteForSolo(): void {
    DBG('unmute for solo');
    this.setValueSmoothed(this._muteForSoloGainNode.gain, 1);
  }

  private setValueSmoothed(audioParam: AudioParam, value: number): void {
    new FwdAudioParamWrapper(this.fwdAudio, audioParam).rampTo(value, 0.005);
  }

  private assertReady(): void {
    this.assertInitialized();
    this.assertNotTornDown();
  }

  private assertInitialized(): void {
    if (! this._audioReady) {
      throw new Error(`The track ${this.trackName} wasn't initialized.`);
    }
  }

  private assertNotTornDown(): void {
    if (this._tornDown) {
      throw new Error(`The track ${this.trackName} was removed.`);
    }
  }
}