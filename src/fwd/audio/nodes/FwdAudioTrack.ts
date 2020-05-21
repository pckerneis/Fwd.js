import { decibelsToGain, gainToDecibels } from "../../core/utils/decibels";
import { clamp } from "../../core/utils/numbers";
import { Logger } from "../../utils/dbg";
import { FwdAudio } from "../FwdAudio";
import parentLogger from "../logger.audio";
import { FwdAudioNode } from "./FwdAudioNode";

const DBG = new Logger('FwdAudioTrack', parentLogger);

export interface FwdAudioTrackListener {
  onTrackMute: Function,
  onTrackUnmute: Function,
  onTrackSolo: Function,
  onTrackUnsolo: Function,
  onTrackPanChange: (newValue: number) => void,
  onTrackVolumeChange: (newValue: number) => void,
  onTrackAudioReady: () => void,
}

export interface FwdAudioTrackOptions {
  gain: number,
  pan: number,
  mute: boolean,
  solo: boolean,
}

export const defaultFwdAudioTrackOptions: FwdAudioTrackOptions = {
  gain: 1,
  pan: 0,
  mute: false,
  solo: false,
};

export class FwdAudioTrack extends FwdAudioNode {

  public readonly listeners: Partial<FwdAudioTrackListener>[] = [];

  private _audioReady: boolean = false;

  private _muteForSoloGainNode: GainNode;
  private _muteGainNode: GainNode;
  private _panNode: StereoPannerNode;
  private _postGainNode: GainNode;

  private _mute: boolean;
  private _solo: boolean;
  private _pan: number;
  private _gain: number;

  constructor(public readonly fwdAudio: FwdAudio, public readonly trackName: string, options: FwdAudioTrackOptions) {
    super();

    this._mute = options.mute;
    this._solo = options.solo;
    this._gain = options.gain;
    this._pan = options.pan;
  }

  public get inputNode(): AudioNode { return this._muteForSoloGainNode; }
  public get outputNode(): AudioNode { return this._muteGainNode; }

  public get meteringNode(): AudioNode { return this._postGainNode; }

  public get audioIsReady(): boolean { return this._audioReady; }

  public get gain(): number {
    this.assertNotTornDown();
    return this._gain;
  }

  public set gain(value: number) {
    this.assertNotTornDown();

    const clamped = clamp(value, 0, 1);
    this._gain = clamped;

    if (this.audioIsReady) {
      this.setValueSmoothed(this._postGainNode.gain, clamped);
    }

    this.listeners.forEach((l) => {
      if (typeof l.onTrackVolumeChange === 'function') {
        l.onTrackVolumeChange(clamped);
      }
    });
  }

  public get volume(): number {
    this.assertNotTornDown();
    return gainToDecibels(this._gain);
  }

  public set volume(dB: number) {
    this.gain = decibelsToGain(dB);
  }

  public get pan(): number {
    this.assertNotTornDown();
    return this._pan;
  }

  public set pan(value: number) {
    this.assertNotTornDown();

    const clamped = clamp(value, -1, 1);

    this._pan = clamped;

    if (this.audioIsReady) {
      this.setValueSmoothed(this._panNode.pan, clamped);
    }

    this.listeners.forEach((l) => {
      if (typeof l.onTrackPanChange === 'function') {
        l.onTrackPanChange(clamped);
      }
    });
  }

  public get isMute(): boolean {
    return this._mute;
  }

  public prepareAudio(): void {
    if (this._audioReady) {
      this.doTearDown(0);
    }

    this._muteForSoloGainNode = this.fwdAudio.context.createGain();
    this._muteGainNode = this.fwdAudio.context.createGain();
    this._panNode = this.fwdAudio.context.createStereoPanner();
    this._postGainNode = this.fwdAudio.context.createGain();

    this._muteForSoloGainNode.gain.value = 1;
    this._muteGainNode.gain.value = 1;
    this._postGainNode.gain.value = 1;

    this._muteForSoloGainNode
      .connect(this._panNode)
      .connect(this._postGainNode)
      .connect(this._muteGainNode)
      .connect(this.fwdAudio.master.nativeNode);

    this._audioReady = true;

    if (this._mute) {
      this.mute();
    } else {
      this.unmute();
    }

    this.gain = this._gain;
    this.pan = this._pan;

    this.listeners.forEach((l) => {
      if (typeof l.onTrackAudioReady === 'function') {
        l.onTrackAudioReady();
      }
    });
  }

  public solo(): void {
    this.assertReady();
    //this.fwdAudio.soloTrack(this.trackName);
  }

  public unsolo(): void {
    this.assertReady();
    // this.fwdAudio.unsoloTrack(this.trackName)
    // TODO: replace with previous line when multi-soloing is implemented
    //this.fwdAudio.unsoloAllTracks();
  }

  public mute(): void {
    this.assertNotTornDown();
    DBG.info('mute ' + this.trackName);
    this._mute = true;

    if (this._audioReady) {
      this.setValueSmoothed(this._muteGainNode.gain, 0);
    }

    this.listeners.forEach((l) => {
      if (typeof l.onTrackMute === 'function') {
        l.onTrackMute()
      }
    });
  }

  public unmute(): void {
    this.assertNotTornDown();
    DBG.info('unmute ' + this.trackName);

    this._mute = false;

    if (this._audioReady) {
      this.setValueSmoothed(this._muteGainNode.gain, 1);
    }

    this.listeners.forEach((l) => {
      if (typeof l.onTrackUnmute === 'function') {
        l.onTrackUnmute()
      }
    });
  }

  public muteForSolo(): void {
    this.assertNotTornDown();
    DBG.info('mute for solo ' + this.trackName);
    this.setValueSmoothed(this._muteForSoloGainNode.gain, 0);
  }

  public unmuteForSolo(): void {
    this.assertNotTornDown();
    DBG.info('unmute for solo');
    this.setValueSmoothed(this._muteForSoloGainNode.gain, 1);
  }

  // Overrides AudioNode.tearDown
  public tearDown(): void {
    this.assertInitialized();

    if (this.tearedDownCalled) {
      throw new Error('You cannot call tearDown more than once on the same audio node!');
    }

    this.tearedDownCalled = true;

    const dueTime = this.fwdAudio.now();
    const when = dueTime - this.fwdAudio.context.currentTime;
    this.doTearDown(when);
  }

  //=========================================================================

  protected doTearDown(when: number): void {
    this.assertInitialized();

    this._muteForSoloGainNode.disconnect();
    this._muteGainNode.disconnect();
    this._panNode.disconnect();
    this._postGainNode.disconnect();
  }

  private setValueSmoothed(audioParam: AudioParam, value: number): void {
    audioParam.setValueAtTime(audioParam.value, this.fwdAudio.context.currentTime);
    audioParam.linearRampToValueAtTime(value, this.fwdAudio.context.currentTime + 0.05);
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
    if (this.wasTornDown) {
      throw new Error(`The track ${this.trackName} was torn down and therefore shouldn't be used.`);
    }
  }
}
