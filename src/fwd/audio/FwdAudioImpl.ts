import { Time } from '../core/EventQueue/EventQueue';
import { Fwd, fwd } from '../core/Fwd';
import { Logger } from "../utils/dbg";
import { FwdAudio, FwdAudioListener } from "./FwdAudio";
import parentLogger from './logger.audio';
import { defaultFwdAudioTrackOptions, FwdAudioTrack, FwdAudioTrackOptions } from "./nodes/FwdAudioTrack";
import { FwdGainNode, FwdLFONode, FwdNoiseNode, FwdOscillatorNode, FwdSamplerNode } from "./nodes/StandardAudioNodes";

const DBG = new Logger('FwdAudioImpl', parentLogger);

export class FwdAudioImpl implements FwdAudio {
  public readonly listeners: FwdAudioListener[] = [];

  private _fwd: Fwd;

  private _ctx: AudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  private _tracks: Map<string, FwdAudioTrack>;

  private _soloedTrack: string = null;

  private _contextReady: boolean = false;

  private _firstPerformanceStarted: boolean = false;

  private _initTimeTracks: string[] = [];

  constructor() {
    this._tracks = new Map<string, FwdAudioTrack>();
  }

  public get isContextReady(): boolean {
    return this._contextReady;
  }

  public get context(): AudioContext { return this._ctx; }

  public get master(): FwdGainNode {
    return this._masterGain;
  }

  public get tracks(): FwdAudioTrack[] {
    return Array.from(this._tracks.values());
  }
  
  public get soloedTrack(): string {
    return this._soloedTrack;
  }

  public initializeModule(fwd: Fwd): void {
    this._fwd = fwd;
  
    this._fwd.scheduler.timeProvider = () => {
      return this._ctx.currentTime;
    };

    this._fwd.performanceListeners.push({
      onPerformanceAboutToStart: () => {
        if (! this._firstPerformanceStarted) {
          this._initTimeTracks = Array.from(this._tracks.values()).map(t => t.trackName);
        }

        this._firstPerformanceStarted = true;
      },
    });
  }

  public start(): void {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
  }

  public now(): Time {
    return this._fwd.now() + this._startOffset;
  }

  //===============================================================================

  public addTrack(trackName: string, options?: Partial<FwdAudioTrackOptions>): FwdAudioTrack {
    const existingTrack = this._tracks.get(trackName);

    if (existingTrack != null) {
      if (this._initTimeTracks.includes(existingTrack.trackName)) {
        return existingTrack;
      } else {
        fwd.err(`A track already exists with the name ${trackName}.`);
        return null;
      }
    }

    const trackOptions: FwdAudioTrackOptions = {
      ...defaultFwdAudioTrackOptions,
      ...options,
    };

    const track = new FwdAudioTrack(this, trackName, trackOptions);
    this._tracks.set(trackName, track);

    if (this._soloedTrack !== null) {
      track.muteForSolo();
    }

    this.listeners.forEach(l => {
      if (typeof l.audioTrackAdded === 'function')
        l.audioTrackAdded(track)
    });

    return track;
  }

  public removeTrack(trackName: string): void {
    const track = this.doGetTrack(trackName,
      `The track "${trackName}" cannot be removed because it doesn't exist.`);

    if (track == null) {
      return;
    }

    if (this.isContextReady) {
      track.tearDown();
    }

    // Unsolo that track
    if (this._soloedTrack === trackName) {
      this._tracks.forEach(t => t.unmuteForSolo());
    }

    this._tracks.delete(trackName);

    this.listeners.forEach(l => {
      if (typeof l.audioTrackRemoved === 'function')
        l.audioTrackRemoved(track)
    });
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
        track.unmuteForSolo();
      } else {
        track.muteForSolo();
      }
    });

    if (this._soloedTrack !== null) {
      DBG.info('soloTrack(): transmit unsolo event for previous solo track', this._soloedTrack);
      this._tracks.get(this._soloedTrack).listeners.forEach((l) => {
        if (typeof l.onTrackUnsolo === 'function') {
          l.onTrackUnsolo();
        }
      });
    }

    this._soloedTrack = trackName;
    track.listeners.forEach((l) => {
      if (typeof l.onTrackSolo === 'function') {
        l.onTrackSolo()
      }
    });
  }

  public unsoloAllTracks(): void {
    if (this._soloedTrack !== null) {
      this._tracks.forEach((t) => t.unmuteForSolo());
      DBG.info('unsoloAllTracks: unmuteForSolo called');

      this._tracks.get(this._soloedTrack).listeners.forEach((l) => {
        if (typeof l.onTrackUnsolo === 'function') {
          l.onTrackUnsolo();
          DBG.info('unsoloAllTracks: transmit unsolo event');
        }
      });

      this._soloedTrack = null;
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

    Array.from(this._tracks.values())
      .filter(t => ! this._initTimeTracks.includes(t.trackName))
      .forEach(t => {
        this.removeTrack(t.trackName);
      });

    this._contextReady = true;
    this._soloedTrack = null;

    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);

    this.listeners.forEach(l => {
      if (typeof l.audioContextStarted === 'function')
        l.audioContextStarted(this._ctx)
    });
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

