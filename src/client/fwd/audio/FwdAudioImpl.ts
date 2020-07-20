import { Time } from '../core/EventQueue/EventQueue';
import { FwdScheduler } from '../core/FwdScheduler';
import { Logger, LoggerLevel } from "../utils/Logger";
import { FwdAudio } from "./FwdAudio";
import parentLogger from './logger.audio';
import {
  FwdCompressorNode,
  FwdDelayLineNode,
  FwdDistortionNode,
  FwdGainNode,
  FwdLFONode,
  FwdNoiseNode,
  FwdOscillatorNode, FwdReverbNode,
  FwdSamplerNode,
  FwdStereoDelayNode,
} from './nodes/StandardAudioNodes';

const DBG = new Logger('FwdAudioImpl', parentLogger, LoggerLevel.none);

export class FwdAudioImpl implements FwdAudio {

  private _ctx: AudioContext | OfflineAudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  private _contextReady: boolean = false;

  constructor(public readonly fwdScheduler: FwdScheduler) {
  }

  public get isContextReady(): boolean {
    return this._contextReady;
  }

  public get context(): AudioContext | OfflineAudioContext { return this._ctx; }

  public get master(): GainNode {
    return this._masterGain.nativeNode;
  }

  public start(): void {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
    DBG.debug('start at ' + this._startOffset);
  }

  public now(): Time {
    DBG.debug('now is ' + (this.fwdScheduler.now() + this._startOffset));
    return this.fwdScheduler.now() + this._startOffset;
  }

  public startOffline(duration: number, sampleRate: number = 44100): OfflineAudioContext {
    this._ctx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);

    // TODO: in a many-to-one situation (many FwdAudio for one FwdScheduler), this is BAD
    this.fwdScheduler.clockFunction = () => this._ctx.currentTime;

    this._startOffset = this._ctx.currentTime;

    this._contextReady = true;

    return this._ctx;
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

  public reverb(reverbTime?: number, preDelayTime?: number): FwdReverbNode {
    this.assertInit();
    return new FwdReverbNode(this);
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

    // TODO: in a many-to-one situation (many FwdAudio for one FwdScheduler), this is BAD
    this.fwdScheduler.clockFunction = () => this._ctx.currentTime;
  }

  private assertInit(): void {
    if (this.fwdScheduler == null) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }
}

