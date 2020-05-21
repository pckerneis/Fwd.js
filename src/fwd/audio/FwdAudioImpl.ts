import { Time } from '../core/EventQueue/EventQueue';
import { Fwd } from '../core/Fwd';
import { Logger, LoggerLevel } from "../utils/dbg";
import { FwdAudio, FwdAudioListener } from "./FwdAudio";
import parentLogger from './logger.audio';
import {
  FwdCompressorNode,
  FwdDelayLineNode,
  FwdDistortionNode,
  FwdGainNode,
  FwdLFONode,
  FwdNoiseNode,
  FwdOscillatorNode,
  FwdSamplerNode,
  FwdStereoDelayNode,
} from "./nodes/StandardAudioNodes";

const DBG = new Logger('FwdAudioImpl', parentLogger, LoggerLevel.none);

export class FwdAudioImpl implements FwdAudio {
  public readonly listeners: FwdAudioListener[] = [];

  private _fwd: Fwd;

  private _ctx: AudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  private _contextReady: boolean = false;

  constructor() {
  }

  public get isContextReady(): boolean {
    return this._contextReady;
  }

  public get context(): AudioContext { return this._ctx; }

  public get master(): GainNode {
    return this._masterGain.nativeNode;
  }

  public initializeModule(fwd: Fwd): void {
    this._fwd = fwd;
  }

  public start(): void {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
    DBG.debug('start at ' + this._startOffset);

  }

  public now(): Time {
    DBG.debug('now is ' + (this._fwd.now() + this._startOffset));
    return this._fwd.now() + this._startOffset;
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

  public delayLine(initialDelayTime: number): FwdDelayLineNode {
    this.assertInit();
    return new FwdDelayLineNode(this, initialDelayTime);
  }

  public stereoDelay(): FwdStereoDelayNode {
    this.assertInit();
    return new FwdStereoDelayNode(this);
  }

  public distortion(amount: number): FwdDistortionNode {
    this.assertInit();
    return new FwdDistortionNode(this, amount);
  }

  public compressor(): FwdCompressorNode {
    this.assertInit();
    return new FwdCompressorNode(this);
  }

  //=========================================================================

  private resetAudioContext(): void {
    if (this._ctx) {
      return;
    }

    this._ctx = new AudioContext();

    this._contextReady = true;

    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);

    this.listeners.forEach(l => {
      if (typeof l.audioContextStarted === 'function') {
        l.audioContextStarted(this._ctx)
      }
    });

    this._fwd.scheduler.timeProvider = () => this._ctx.currentTime;
  }

  private assertInit(): void {
    if (this._fwd == null) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }
}

