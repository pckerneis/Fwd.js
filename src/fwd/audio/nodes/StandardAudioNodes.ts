import path from "path";
import { Time } from "../../core/EventQueue/EventQueue";
import { fwd } from "../../core/Fwd";
import { clamp } from "../../core/utils/numbers";
import { Logger, LoggerLevel } from "../../utils/dbg";
import { FwdAudio } from "../FwdAudio";
import parentLogger from "../logger.audio";
import { FwdAudioNode } from "./FwdAudioNode";

const DBG = new Logger('StandardAudioNodes', parentLogger, LoggerLevel.debug);

export class FwdAudioParamWrapper extends FwdAudioNode {
  public outputNode: AudioNode = null;

  constructor(readonly fwdAudio: FwdAudio, private _param: AudioParam) {
    super();
  }

  public get inputNode(): AudioParam {
    return this._param;
  }

  public set value(newValue: number) {
    this._param.value = newValue;
  }

  public get value(): number { return this._param.value}

  public rampTo(value: number, time: number): void {
    const audioNow = this.fwdAudio.now();

    // Check if cancelAndHoldAtTime is implemented
    if (typeof this._param.cancelAndHoldAtTime === 'function') {
      this._param.cancelAndHoldAtTime(audioNow);
      this._param.linearRampToValueAtTime(value, audioNow + time);
    } else {
      // Falls back to deferring the call to linearRampToValueAtTime
      fwd.schedule(0, () => {
        this._param.setValueAtTime(this._param.value, 0);
        this._param.linearRampToValueAtTime(value, audioNow + time);
      });
    }
  }

  protected doTearDown(/* when: Time */): void {
    throw new Error('You shouldn\'t call "tearDown" on a audio parameter.');
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
  
  private _output: GainNode;
  private _osc: OscillatorNode;

  private _type: OscillatorType;

  constructor (public readonly fwdAudio: FwdAudio, freq: number, type: OscillatorType) {
    super();

    this._output = fwdAudio.context.createGain();
    this._output.gain.value = 1;
    
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
  }

  public get inputNode(): AudioNode | AudioParam { return null; }
  public get outputNode(): AudioNode { return this._output; }

  public get oscillator(): OscillatorNode {
    return this._osc;
  }

  public get frequency(): FwdAudioParamWrapper {
    this.assertIsReady('get frequency');
    return new FwdAudioParamWrapper(this.fwdAudio, this._osc.frequency);
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
      .then(audioBuffer => this._buffer = audioBuffer);
  }
}

//===============================================================

export class FwdNoiseNode extends FwdAudioNode {
  private _output: AudioBufferSourceNode;

  constructor(public readonly fwdAudio: FwdAudio) {
    super();

    this._output = fwdAudio.context.createBufferSource();
    this._output.loop = true;
    this._output.buffer = this.generateWhiteNoise();
    this._output.start(fwdAudio.now());
  }

  public get inputNode(): AudioNode { return null; }
  public get outputNode(): AudioNode { return this._output; }

  protected doTearDown(when: Time): void {
    tearDownNativeNode(this._output, when).then(() => {
      this._output = null;
    });
  }

  private generateWhiteNoise(): AudioBuffer {
    const sampleRate = this.fwdAudio.context.sampleRate;
    const buffer = this.fwdAudio.context.createBuffer(1, 2 * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < 2 * sampleRate; ++i) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
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