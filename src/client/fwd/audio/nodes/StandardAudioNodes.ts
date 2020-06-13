import path from "path";
import { Time } from "../../core/EventQueue/EventQueue";
import { fwd } from "../../core/fwd";
import { Logger, LoggerLevel } from "../../utils/Logger";
import { clamp } from "../../utils/numbers";
import { FwdAudio } from "../FwdAudio";
import parentLogger from "../logger.audio";
import { FwdAudioNode } from "./FwdAudioNode";

const DBG = new Logger('StandardAudioNodes', parentLogger, LoggerLevel.error);

interface LinearRamp {
  startTime: number,
  startValue: number,
  endTime: number,
  endValue: number,
}

export class FwdAudioParamWrapper extends FwdAudioNode {
  public outputNode: AudioNode = null;

  private _latestRamp: LinearRamp;

  constructor(readonly fwdAudio: FwdAudio, private _param: AudioParam) {
    super();
  }

  public get inputNode(): AudioParam {
    return this._param;
  }

  /**
   * Sets the value at the current FwdScheduler's time position.
   * @param newValue the value the param should take. This value is not checked against the validity range of the underlying
   * AudioParam.
   */
  public set value(newValue: number) {
    // Still process the event as a ramp to have a consistent 'getValueAtTime' behaviour.
    this.rampTo(newValue, 0);
  }

  /**
   * Gets the value at the current audio context time.
   */
  // TODO: should we take into account the currently scheduled ramps like in 'getValueAtTime' ?
  public get value(): number { return this._param.value}

  /**
   * Starts a ramp from the FWD scheduler's time position to a time position in the future (current time + rampTime).
   * This is a deferred action: the automation will be effectively scheduled 'later', based on the FwdScheduler's settings.
   *
   * @param value the target value
   * @param rampTime the duration for the ramp
   */
  public rampTo(value: number, rampTime: number): void {
    const audioNow = this.fwdAudio.now();
    const holdValue = this.cancelAndHoldAtTime(audioNow);
    this._param.linearRampToValueAtTime(value, audioNow + rampTime);

    this.registerRamp(holdValue, audioNow, value, audioNow + rampTime);
  }

  protected doTearDown(/* when: Time */): void {
    throw new Error('You shouldn\'t call "tearDown" on a audio parameter.');
  }

  private cancelAndHoldAtTime(when: Time): number {
    const holdValue = this.getValueAtTime(when);
    DBG.debug('holdValue : ' + holdValue);
    this._param.setValueAtTime(holdValue, when);
    return holdValue;
  }

  private registerRamp(startValue: number, startTime: Time, endValue: number, endTime: Time): void {
    this._latestRamp = {
      startTime, startValue, endTime, endValue,
    };
  }

  private getValueAtTime(when: Time): number {
    // If no ramp was ever scheduled, just return the current native AudioParam's value.
    if (this._latestRamp == null) {
      DBG.debug('no ramp');
      return this._param.value;
    }

    if (when < this._latestRamp.startTime) {
      DBG.debug('before');
      return this._latestRamp.startValue;
    } else if (when > this._latestRamp.endTime) {
      DBG.debug('after');
      return this._latestRamp.endValue;
    } else {
      // Linear interpolation
      const t1 = this._latestRamp.startTime;
      const t2 = this._latestRamp.endTime;
      const v1 = this._latestRamp.startValue;
      const v2 = this._latestRamp.endValue;

      if (t1 === t2) {
        return v2;
      }

      const linearInterpolation = ((v1 - v2) / (t1 - t2)) * when + ((t1 * v2 - t2 * v1) / (t1 - t2));
      DBG.debug('linear interp :' + linearInterpolation);
      return linearInterpolation;
    }
  }
}

//=========================================================================

export abstract class FwdAudioNodeWrapper<T extends AudioNode> extends FwdAudioNode {

  protected constructor(private readonly _fwdAudio: FwdAudio, private _nativeNode: T) {
    super();
  }
  public abstract get inputNode(): AudioNode | AudioParam;

  public abstract get outputNode(): AudioNode;

  public get nativeNode(): T { return this._nativeNode; }

  public get fwdAudio(): FwdAudio { return this._fwdAudio; }

  protected assertIsReady(context: string): void {
    if (this._nativeNode == null) {
      throw new Error(context + ': this audio node was teared down or not initialized.');
    }
  }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._nativeNode, when).then(() => {
      this._nativeNode = null;
    });
  }
}

//=========================================================================

export class FwdGainNode extends FwdAudioNodeWrapper<GainNode> {
  private readonly _gainWrapper: FwdAudioParamWrapper;

  constructor(fwdAudio: FwdAudio, defaultValue: number = 0) {
    super(fwdAudio, fwdAudio.context.createGain());
    this.nativeNode.gain.setValueAtTime(defaultValue, 0);
    this._gainWrapper = new FwdAudioParamWrapper(this.fwdAudio, this.nativeNode.gain);
  }

  public get inputNode(): AudioNode | AudioParam { return this.nativeNode; }
  public get outputNode(): AudioNode { return this.nativeNode; }

  public get gain(): FwdAudioParamWrapper { return this._gainWrapper; }

  public rampTo(value: number, time: number): void {
    this.gain.rampTo(value, time);
  }
}

//=========================================================================

export class FwdOscillatorNode extends FwdAudioNode {

  public static MIN_FREQ: number = 0;
  public static MAX_FREQ: number = 40000;

  public readonly gain: FwdAudioParamWrapper;
  public readonly frequency: FwdAudioParamWrapper;

  private _output: GainNode;
  private _osc: OscillatorNode;

  private _type: OscillatorType;

  constructor (public readonly fwdAudio: FwdAudio, freq: number, type: OscillatorType) {
    super();

    this._output = fwdAudio.context.createGain();
    this._output.gain.value = 0;

    this._osc = fwdAudio.context.createOscillator();

    this._osc.connect(this._output);

    if (! isNaN(freq)) {
      this._osc.frequency.value = clamp(freq, FwdOscillatorNode.MIN_FREQ, FwdOscillatorNode.MAX_FREQ);
    } else {
      this._osc.frequency.value = 0;
    }

    this._type = type;
    this._osc.type = type;
    this._osc.start(fwdAudio.now());

    this.gain = new FwdAudioParamWrapper(this.fwdAudio, this._output.gain);
    this.frequency = new FwdAudioParamWrapper(this.fwdAudio, this._osc.frequency);
  }

  public get inputNode(): AudioNode | AudioParam { return null; }
  public get outputNode(): AudioNode { return this._output; }

  public get oscillator(): OscillatorNode {
    return this._osc;
  }

  public get type(): OscillatorType {
    return this._type;
  }

  public setType(type: OscillatorType): void {
    this.assertIsReady('set type');
    fwd.schedule(fwd.now(), () => {
      this._type = type;
      this._osc.type = type;
    });
  }

  public setFrequency(fq: number): void {
    this.assertIsReady('set frequency');

    if (isNaN(fq)) {
      return;
    }

    fq = clamp(fq, FwdOscillatorNode.MIN_FREQ, FwdOscillatorNode.MAX_FREQ);

    const audioNow = this.fwdAudio.now();
    this._osc.frequency.setValueAtTime(fq, audioNow);
  }

  public stop(): void {
    this.assertIsReady('stop');
    const audioNow = this.fwdAudio.now();
    this._osc.stop(audioNow);
  }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._osc, when).then(() => {
      this._osc = null;
    });

    tearDownNativeNode(this._osc, when).then(() => {
      this._output = null;
    });
  }

  private assertIsReady(context: string): void {
    if (this._osc == null || this._output == null) {
      throw new Error(context + ': this audio node was teared down or not initialized.');
    }
  }
}

//===============================================================

export class FwdLFONode extends FwdAudioNode {
  public static MIN_FREQ: number = 0;
  public static MAX_FREQ: number = 40000;

  private _output: GainNode;
  private _osc: OscillatorNode;

  constructor(public fwdAudio: FwdAudio, frequency: number, type: OscillatorType) {
    super();

    this._output = fwdAudio.context.createGain();
    this._output.gain.value = 1;

    // Setup DC offset
    const constantSource = fwdAudio.context.createConstantSource();
    const hiddenGain = fwdAudio.context.createGain();
    hiddenGain.gain.value = 0.5;
    constantSource.connect(hiddenGain).connect(this._output);

    // Setup osc
    this._osc = fwdAudio.context.createOscillator();

    if (! isNaN(frequency)) {
      this._osc.frequency.value = clamp(frequency, FwdLFONode.MIN_FREQ, FwdLFONode.MAX_FREQ);
    } else {
      this._osc.frequency.value = 0;
    }

    this._osc.type = type;
    this._osc.connect(hiddenGain);

    this._osc.start(fwdAudio.now());
    constantSource.start();
  }

  public get inputNode(): AudioNode { return null; }
  public get outputNode(): AudioNode { return this._output; }

  public get oscillator(): OscillatorNode { return this._osc; }

  public set frequency(frequency: number) {
    const audioNow = this.fwdAudio.now();
    this._osc.frequency.setValueAtTime(frequency, audioNow);
  }

  public set type(type: OscillatorType) {
    fwd.schedule(fwd.now(), () => {
      this._osc.type = type;
    });
  }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._osc, when).then(() => {
      this._osc = null;
    });

    tearDownNativeNode(this._osc, when).then(() => {
      this._output = null;
    });
  }
}

//===============================================================

export class FwdSamplerNode extends FwdAudioNode {
  private _output: GainNode;
  private _buffer: AudioBuffer;

  constructor(public fwdAudio: FwdAudio, public readonly pathToFile: string) {
    super();

    this._output = fwdAudio.context.createGain();
    this._output.gain.value = 1;

    this.load();
  }

  public get inputNode(): AudioNode { return null; }
  public get outputNode(): AudioNode { return this._output; }

  public play(): void {
    fwd.schedule(0, () => {
      const source = this._output.context.createBufferSource();
      source.buffer = this._buffer;
      source.connect(this._output);
      source.start(this.fwdAudio.now());
    });
  }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._output, when).then(() => {
      this._output = null;
    });
  }

  private load(): void {
    const url = path.resolve('../../data', this.pathToFile);

    fetch(url)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.fwdAudio.context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => this._buffer = audioBuffer)
      .catch(e => console.error(e));
  }
}

//===============================================================

export class FwdNoiseNode extends FwdAudioNode {
  private _output: AudioBufferSourceNode;

  constructor(public readonly fwdAudio: FwdAudio) {
    super();

    this._output = fwdAudio.context.createBufferSource();
    this._output.loop = true;
    this._output.buffer = FwdNoiseNode.generateWhiteNoise(this.fwdAudio.context);
    this._output.start(fwdAudio.now());
  }

  public static generateWhiteNoise(context: AudioContext, lengthInSeconds: number = 1): AudioBuffer {
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, lengthInSeconds * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < 2 * sampleRate; ++i) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  public get inputNode(): AudioNode { return null; }
  public get outputNode(): AudioNode { return this._output; }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._output, when).then(() => {
      this._output = null;
    });
  }
}

export async function tearDownNativeNode(nativeNode: AudioNode, when: Time): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      if (nativeNode != null) {
        nativeNode.disconnect();

        if (nativeNode instanceof AudioScheduledSourceNode) {
          nativeNode.stop();
        }

        nativeNode = null;
      }

      resolve();
    }, when * 1000);
  });
}

//===============================================================

export class FwdDelayLineNode extends FwdAudioNodeWrapper<DelayNode> {
  private _delay: DelayNode;
  private readonly _delayTime: FwdAudioParamWrapper;

  constructor(fwdAudio: FwdAudio, initialDelayTime: number) {
    super(fwdAudio, fwdAudio.context.createDelay());
    this._delayTime = new FwdAudioParamWrapper(fwdAudio, this.nativeNode.delayTime);
    this.nativeNode.delayTime.value = Math.max(0, initialDelayTime);
  }

  public get inputNode(): AudioNode { return this._delay; }
  public get outputNode(): AudioNode { return this._delay; }

  public get delayTime(): FwdAudioParamWrapper {
    this.assertIsReady('get delayTime');
    return this._delayTime;
  }

  protected doTearDown(when: Time): void {
      tearDownNativeNode(this._delay, when).then(() => {
      this._delay = null;
    });
  }
}

//===============================================================

export class FwdStereoDelayNode extends FwdAudioNode {
  private _input: GainNode;
  private _output: GainNode;
  private _dryGain: GainNode;
  private _wetGain: GainNode;
  private _delayLeft: DelayNode;
  private _delayRight: DelayNode;
  private _feedbackLeft: GainNode;
  private _feedbackRight: GainNode;
  private _panLeft: StereoPannerNode;
  private _panRight: StereoPannerNode;

  constructor(public fwdAudio: FwdAudio) {
    super();

    this._input = fwdAudio.context.createGain();
    this._input.gain.value = 1;

    this._output = fwdAudio.context.createGain();
    this._output.gain.value = 1;

    this._dryGain = fwdAudio.context.createGain();
    this._dryGain.gain.value = 1;
    this._wetGain = fwdAudio.context.createGain();
    this._wetGain.gain.value = 0.3;

    this._delayLeft = fwdAudio.context.createDelay();
    this._delayLeft.delayTime.value = 0.5;

    this._delayRight = fwdAudio.context.createDelay();
    this._delayRight.delayTime.value = 0.25;

    this._feedbackLeft = fwdAudio.context.createGain();
    this._feedbackLeft.gain.value = 0.05;

    this._feedbackRight = fwdAudio.context.createGain();
    this._feedbackRight.gain.value = 0.05;

    this._panLeft = fwdAudio.context.createStereoPanner();
    this._panLeft.pan.value = -1;

    this._panRight = fwdAudio.context.createStereoPanner();
    this._panRight.pan.value = 1;

    this._input.connect(this._dryGain).connect(this._output);
    this._input.connect(this._panLeft).connect(this._delayLeft).connect(this._feedbackLeft).connect(this._delayLeft);
    this._input.connect(this._panRight).connect(this._delayRight).connect(this._feedbackRight).connect(this._delayRight);
    this._delayLeft.connect(this._wetGain);
    this._delayRight.connect(this._wetGain);
    this._wetGain.connect(this._output);
  }

  public get inputNode(): AudioNode { return this._input; }
  public get outputNode(): AudioNode { return this._output; }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._input, when).then(() => this._input = null);
    tearDownNativeNode(this._output, when).then(() => this._output = null);
    tearDownNativeNode(this._wetGain, when).then(() => this._wetGain = null);
    tearDownNativeNode(this._dryGain, when).then(() => this._dryGain = null);
    tearDownNativeNode(this._panLeft, when).then(() => this._panLeft = null);
    tearDownNativeNode(this._panRight, when).then(() => this._panRight = null);
    tearDownNativeNode(this._delayLeft, when).then(() => this._delayLeft = null);
    tearDownNativeNode(this._delayRight, when).then(() => this._delayRight = null);
    tearDownNativeNode(this._feedbackLeft, when).then(() => this._feedbackLeft = null);
    tearDownNativeNode(this._feedbackRight, when).then(() => this._feedbackRight = null);
  }
}

//===============================================================
// TODO: expose parameters
export class FwdDistortionNode extends FwdAudioNodeWrapper<WaveShaperNode> {
  constructor(fwdAudio: FwdAudio, amount: number) {
    super(fwdAudio, fwdAudio.context.createWaveShaper());
    this.nativeNode.curve = this.makeCurve(amount);
  }

  public get inputNode(): AudioNode { return this.nativeNode; }
  public get outputNode(): AudioNode { return this.nativeNode; }

  private makeCurve(amount: number, numSamples: number = 44100): Float32Array {
    const curve = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; ++i ) {
      const x = i * 2 / numSamples - 1;
      curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
    }

    return curve;
  }
}

//===============================================================
// TODO: expose parameters
export class FwdCompressorNode extends FwdAudioNodeWrapper<DynamicsCompressorNode> {
  // private readonly _delayTime: FwdAudioParamWrapper;

  constructor(fwdAudio: FwdAudio) {
    super(fwdAudio, fwdAudio.context.createDynamicsCompressor());
    this.nativeNode.threshold.setValueAtTime(-20, 0);
    this.nativeNode.knee.setValueAtTime(40, 0);
    this.nativeNode.ratio.setValueAtTime(12, 0);
    this.nativeNode.attack.setValueAtTime(0, 0);
    this.nativeNode.release.setValueAtTime(0.25, 0);
  }

  public get inputNode(): AudioNode { return this.nativeNode; }
  public get outputNode(): AudioNode { return this.nativeNode; }
}

//===============================================================
// TODO: expose parameters
export class FwdReverbNode extends FwdAudioNode {
  private _input: GainNode;
  private _output: GainNode;
  private _dryGain: GainNode;
  private _wetGain: GainNode;
  private _convolver: ConvolverNode;
  private _preDelay: DelayNode;

  constructor(public fwdAudio: FwdAudio,
              public reverbTime: number = 1.0,
              public preDelay: number = 0.5) {
    super();

    this._input = fwdAudio.context.createGain();
    this._input.gain.value = 1;

    this._output = fwdAudio.context.createGain();
    this._output.gain.value = 1;

    this._dryGain = fwdAudio.context.createGain();
    this._dryGain.gain.value = 1;
    this._wetGain = fwdAudio.context.createGain();
    this._wetGain.gain.value = 0.3;

    this._convolver = fwdAudio.context.createConvolver();

    this._preDelay = fwdAudio.context.createDelay(reverbTime);
    this._preDelay.delayTime.value = preDelay;

    this._input
      .connect(this._dryGain)
      .connect(this._output);

    this._input
      .connect(this._preDelay)
      .connect(this._convolver)
      .connect(this._wetGain)
      .connect(this._output);

    this.refreshBuffer();
  }

  public get inputNode(): AudioNode { return this._input; }
  public get outputNode(): AudioNode { return this._output; }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._input, when).then(() => this._input = null);
    tearDownNativeNode(this._output, when).then(() => this._output = null);
    tearDownNativeNode(this._wetGain, when).then(() => this._wetGain = null);
    tearDownNativeNode(this._dryGain, when).then(() => this._dryGain = null);
    tearDownNativeNode(this._convolver, when).then(() => this._convolver = null);
    tearDownNativeNode(this._preDelay, when).then(() => this._preDelay = null);
  }

  private refreshBuffer(): void {
    const length = this.fwdAudio.context.sampleRate * this.reverbTime;

    const offlineAudioContext = new OfflineAudioContext(2, length, this.fwdAudio.context.sampleRate);
    const noise = offlineAudioContext.createBufferSource();
    noise.buffer = FwdNoiseNode.generateWhiteNoise(this.fwdAudio.context, this.reverbTime);

    const gain = offlineAudioContext.createGain();

    const lpf = offlineAudioContext.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 5000;
    lpf.Q.value = 1;

    const hpf = offlineAudioContext.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 500;
    hpf.Q.value = 1;

    noise
      .connect(gain)
      .connect(lpf)
      .connect(hpf)
      .connect(offlineAudioContext.destination);

    gain.gain.setValueAtTime(1, 0);
    gain.gain.linearRampToValueAtTime(0, this.reverbTime);

    setTimeout(() => {
      offlineAudioContext.startRendering().then((buffer) => {
        this._convolver.buffer = buffer;
        noise.stop(0);
        noise.disconnect();
        gain.disconnect();
        lpf.disconnect();
        hpf.disconnect();
      });

      noise.start(0);
    });
  }
}
