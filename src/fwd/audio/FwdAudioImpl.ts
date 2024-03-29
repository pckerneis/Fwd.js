import { Time } from '../scheduler/EventQueue/EventQueue';
import { FwdScheduler } from '../scheduler/FwdScheduler';
import { decibelsToGain, gainToDecibels } from '../utils/decibels';
import { Logger, LoggerLevel } from '../utils/Logger';
import { FwdAudio, FwdAudioUtils } from './FwdAudio';
import parentLogger from './logger.audio';
import {
  FwdBufferNode,
  FwdCompressorNode,
  FwdDelayLineNode,
  FwdDistortionNode,
  FwdGainNode,
  FwdLFONode,
  FwdNoiseNode,
  FwdOscillatorNode,
  FwdReverbNode,
  FwdSamplerNode,
  FwdStereoDelayNode,
} from './nodes/StandardAudioNodes';
import { bufferToWave, downloadFile } from './utils';

const DBG = new Logger('FwdAudioImpl', parentLogger, LoggerLevel.none);

export class FwdAudioImpl implements FwdAudio {

  public readonly utils: FwdAudioUtils = {
    decibelsToGain,
    gainToDecibels,
    bufferToWave,
    downloadFile,
  };

  private _ctx: AudioContext | OfflineAudioContext;

  private _masterGain?: FwdGainNode;

  private _startOffset: Time = 0;

  private _contextReady: boolean = false;

  constructor(public readonly fwdScheduler: FwdScheduler) {
  }

  public get isContextReady(): boolean {
    return this._contextReady;
  }

  public get context(): AudioContext | OfflineAudioContext {
    return this._ctx;
  }

  public get master(): GainNode | undefined {
    return this._masterGain?.nativeNode;
  }

  public now(): Time {
    DBG.debug('now is ' + (this.fwdScheduler.now() + this._startOffset));
    return this.fwdScheduler.now() + this._startOffset;
  }

  public start(): AudioContext {
    const newContext = new AudioContext();
    this.setAudioContext(newContext);

    this._startOffset = this._ctx.currentTime;
    DBG.debug('start at ' + this._startOffset);

    return newContext;
  }

  public startOffline(duration: number, sampleRate: number = 44100): OfflineAudioContext {
    const newContext = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
    this.setAudioContext(newContext);

    this._startOffset = this._ctx.currentTime;

    return newContext;
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

  public bufferNode(buffer: AudioBuffer): FwdBufferNode {
    this.assertInit();
    return new FwdBufferNode(this, buffer);
  }

  //=========================================================================

  private setAudioContext(audioContext: OfflineAudioContext | AudioContext): void {
    this._ctx = audioContext;

    if (this._masterGain) {
      this._masterGain.tearDown();
      this._masterGain = undefined;
    }

    this._masterGain = new FwdGainNode(this, 0.5);

    if (this._masterGain.nativeNode)
      this._masterGain.nativeNode.connect(this._ctx.destination);

    this._contextReady = true;
  }

  private assertInit(): void {
    if (! this.isContextReady) {
      throw new Error('The FwdAudio\'s audio context is not ready. You should call "start" or "startOffline".`');
    }
  }
}

