import path from "path";
import { Time } from "../../core/EventQueue/EventQueue";
import { fwd } from "../../core/Fwd";
import { clamp } from "../../core/utils/numbers";
import { FwdAudio } from "../FwdAudio";
import { FwdAudioNode } from "./FwdAudioNode";

export class FwdAudioParamWrapper extends FwdAudioNode {
  public outputNode: AudioNode = null;

  constructor(readonly fwdAudio: FwdAudio, private _param: AudioParam) {
    super();
  }

  public get inputNode(): AudioParam {
    return this._param;
  }

  public get value(): number { return this._param.value}

  public rampTo(value: number, time: number): void {
    const audioNow = this.fwdAudio.now();
    this._param.cancelAndHoldAtTime(audioNow);
    this._param.linearRampToValueAtTime(value, audioNow + time);
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

export class FwdOscillatorNode extends FwdAudioNodeWrapper<OscillatorNode> {

  private static MIN_FREQ: number = 0;
  private static MAX_FREQ: number = 40000;

  private _type: OscillatorType;

  constructor (fwdAudio: FwdAudio, freq: number, type: OscillatorType) {
    super(fwdAudio, fwdAudio.context.createOscillator());

    if (! isNaN(freq)) {
      this.nativeNode.frequency.value = clamp(freq, FwdOscillatorNode.MIN_FREQ, FwdOscillatorNode.MAX_FREQ);
    } else {
      this.nativeNode.frequency.value = 0;
    }

    this._type = type;
    this.nativeNode.type = type;
    this.nativeNode.start();
  }

  public get inputNode(): AudioNode | AudioParam { return null; }
  public get outputNode(): AudioNode { return this.nativeNode; }

  public get frequency(): FwdAudioParamWrapper {
    this.assertIsReady('get frequency');
    return new FwdAudioParamWrapper(this.fwdAudio, this.nativeNode.frequency);
  }

  public get type(): OscillatorType {
    this.assertIsReady('get type');
    return this._type;
  }

  public setType(type: OscillatorType): void {
    fwd.schedule(fwd.now(), () => {
      this.assertIsReady('set type');
      this._type = type;
      this.nativeNode.type = type;
    });
  }

  public setFrequency(fq: number): void {
    this.assertIsReady('set frequency');

    if (isNaN(fq)) {
      return;
    }

    fq = clamp(fq, FwdOscillatorNode.MIN_FREQ, FwdOscillatorNode.MAX_FREQ);

    const audioNow = this.fwdAudio.now();
    this.nativeNode.frequency.setValueAtTime(fq, audioNow);
  }

  public stop(): void {
    this.assertIsReady('stop');
    const audioNow = this.fwdAudio.now();
    this.nativeNode.stop(audioNow);
  }
}

//===============================================================

export class FwdLFONode extends FwdAudioNode {
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
    this._osc.frequency.value = frequency;
    this._osc.type = type;
    this._osc.connect(hiddenGain);

    this._osc.start();
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
    this._output.start(0);
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