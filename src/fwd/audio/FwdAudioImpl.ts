import { Time } from '../core/EventQueue/EventQueue';
import { Fwd, fwd } from '../core/Fwd';
import { FwdAudio, FwdAudioListener } from "./FwdAudio";
import { FwdAudioTrack } from "./nodes/FwdAudioTrack";
import { FwdGainNode, FwdLFONode, FwdNoiseNode, FwdOscillatorNode, FwdSamplerNode } from "./nodes/StandardAudioNodes";

const DBG = (...messages: string[]) => console.log(...messages);

export class FwdAudioImpl implements FwdAudio {
  public readonly listeners: FwdAudioListener[] = [];

  private _fwd: Fwd;

  private _ctx: AudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  private _tracks: Map<string, FwdAudioTrack>;

  private _soloTrack: string = null;

  constructor(private _contextReady: boolean = false) {
    this._tracks = new Map<string, FwdAudioTrack>();
  }

  public get isContextReady(): boolean {
    return this._contextReady;
  }

  public get context(): AudioContext { return this._ctx; }

  public get master(): FwdGainNode {
    return this._masterGain;
  }

  public initializeModule(fwd: Fwd): void {
    this._fwd = fwd;
  
    this._fwd.scheduler.timeProvider = () => {
      return this._ctx.currentTime;
    }
  }

  public start(): void {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
  }

  public now(): Time {
    return this._fwd.now() + this._startOffset;
  }

  //===============================================================================

  public addTrack(trackName: string): FwdAudioTrack {
    if (this._tracks.get(trackName) != null) {
      fwd.err(`A track already exists with the name ${trackName}.`);
      return null;
    }

    const track = new FwdAudioTrack(this, trackName);
    this._tracks.set(trackName, track);

    if (this.isContextReady && this._soloTrack !== null) {
      track['_muteForSolo']();
    }

    this.listeners.forEach(l => l.audioTrackAdded(track));

    return track;
  }

  public removeTrack(trackName: string): void {
    const track = this.doGetTrack(trackName,
      `The track "${trackName}" cannot be removed because it doesn't exist.`);

    if (track == null) {
      return;
    }
    
    track.tearDown();
    
    // Unsolo that track
    if (this._soloTrack === trackName) {
      this._tracks.forEach(t => t['_unmuteForSolo']());
    }

    this._tracks.delete(trackName);
    this.listeners.forEach(l => l.audioTrackRemoved(track));
  }

  public getTrack(trackName: string): FwdAudioTrack {
    return this.doGetTrack(trackName,
      `The track "${trackName}" doesn't exist.`);
  }

  public soloTrack(trackName: string): void {
    const track = this.doGetTrack(trackName,
      `Cannot solo track "${trackName}" because it doesn't exist.`);

    if (track == null) {
      return;
    }

    this._tracks.forEach((track) => {
      if (track.trackName === trackName) {
        track['_unmuteForSolo']();
      } else {
        track['_muteForSolo']();
      }
    });

    if (this._soloTrack !== null) {
      DBG('soloTrack(): transmit unsolo event for previous solo track', this._soloTrack);
      this._tracks.get(this._soloTrack).listeners.forEach((l) => l.onTrackUnsolo());
    }

    this._soloTrack = trackName;
    track.listeners.forEach((l) => l.onTrackSolo());
  }

  public unsoloAllTracks(): void {
    if (this._soloTrack !== null) {
      this._tracks.forEach((t) => t['_unmuteForSolo']());
      DBG('unsoloAllTracks: _unmuteForSolo called');

      this._tracks.get(this._soloTrack).listeners.forEach((l) => {
        l.onTrackUnsolo();
        DBG('unsoloAllTracks: transmit unsolo event');
      });

      this._soloTrack = null;
    }
  }

  //===============================================================================

  public gain(value: number = 0): FwdGainNode {
    this.assertInit();
    return new FwdGainNode(this, value);
  }

  public osc(frequency: number = 440, type: OscillatorType = 'sine'): FwdOscillatorNode {
    this.assertInit();
    return new FwdOscillatorNode(this, frequency, type);
  }

  public lfo(frequency: number = 1, type: OscillatorType = 'sine'): FwdLFONode {
    this.assertInit();
    return new FwdLFONode(this, frequency, type);
  }

  public sampler(pathToFile: string): FwdSamplerNode {
    this.assertInit();
    return new FwdSamplerNode(this, pathToFile);
  }

  public noise(): FwdNoiseNode {
    this.assertInit();
    return new FwdNoiseNode(this);
  }

  //=========================================================================

  private resetAudioContext(): void {
    this._ctx = new AudioContext();

    if (this.isContextReady) {
      this._tracks.forEach(t => t.tearDown());
    }

    this._contextReady = true;

    this._tracks.forEach(track => {
      this.listeners.forEach(l => l.audioTrackRemoved(track));
    });

    this._tracks = new Map<string, FwdAudioTrack>();
    this._soloTrack = null;

    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);

    this.listeners.forEach(l => l.audioContextStarted(this._ctx));
  }

  private assertInit(): void {
    if (this._fwd == null) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }

  private doGetTrack(trackName: string, errorMessage: string): FwdAudioTrack {
    const track = this._tracks.get(trackName);

    if (track == null) {
      fwd.err(errorMessage);
      return null;
    }

    return track;
  }
}

