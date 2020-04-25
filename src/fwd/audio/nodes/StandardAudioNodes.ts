import path from "path";
import { fwd } from "../../core/fwd";
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

  public rampTo(value: number, time: number): void {
    const audioNow = this.fwdAudio.now();
    this._param.cancelAndHoldAtTime(audioNow);
    this._param.linearRampToValueAtTime(value, audioNow + time);
  }
}

//=========================================================================

export abstract class FwdAudioNodeWrapper<T extends AudioNode> extends FwdAudioNode {

  private tearedDownCalled: boolean = false;

  protected constructor(private readonly _fwdAudio: FwdAudio, private _nativeNode: T) {
    super();
  }
  public get inputNode(): AudioNode | AudioParam { return this.nativeNode; }

  public get outputNode(): AudioNode { return this.nativeNode; }

  public get nativeNode(): T { return this._nativeNode; }

  public get fwdAudio(): FwdAudio { return this._fwdAudio; }

  public tearDown(): void {
    if (this.tearedDownCalled) {
      throw new Error('You cannot call tearDown more than once on the same audio node!');
    }

    this.tearedDownCalled = true;

    const dueTime = this.fwdAudio.now();
    const when = dueTime - this.fwdAudio.context.currentTime;

    setTimeout(() => {
      if (this._nativeNode != null) {
        this._nativeNode.disconnect();

        if (this._nativeNode instanceof AudioScheduledSourceNode) {
          this._nativeNode.stop();
        }

        this._nativeNode = null;
      }
    }, when * 1000);
  }

  protected assertIsReady(context: string): void {
    if (this._nativeNode == null) {
      throw new Error(context + ': this audio node was teared down or not initialized.');
    }
  }
}

//=========================================================================

export class FwdGainNode extends FwdAudioNodeWrapper<GainNode> {
  constructor(fwdAudio: FwdAudio, defaultValue: number = 0) {
    super(fwdAudio, fwdAudio.context.createGain());
    this.nativeNode.gain.setValueAtTime(defaultValue, 0);
  }

  public get gain(): FwdAudioParamWrapper { return new FwdAudioParamWrapper(this.fwdAudio, this.nativeNode.gain); }

  public rampTo(value: number, time: number): void {
    this.gain.rampTo(value, time);
  }
}

//=========================================================================

export class FwdOscillatorNode extends FwdAudioNodeWrapper<OscillatorNode> {

  private static MIN_FREQ: number = 0;
  private static MAX_FREQ: number = 40000;

  constructor (fwdAudio: FwdAudio, freq: number, type: OscillatorType) {
    super(fwdAudio, fwdAudio.context.createOscillator());

    if (! isNaN(freq)) {
      this.nativeNode.frequency.value = clamp(freq, FwdOscillatorNode.MIN_FREQ, FwdOscillatorNode.MAX_FREQ);
    } else {
      this.nativeNode.frequency.value = 0;
    }

    this.nativeNode.type = type;
    this.nativeNode.start();
  }

  public get frequency(): FwdAudioParamWrapper {
    return new FwdAudioParamWrapper(this.fwdAudio, this.nativeNode.frequency);
  }

  public setType(type: OscillatorType): void {
    fwd.schedule(fwd.now(), () => {
      if (this.nativeNode !== null) {
        this.nativeNode.type = type;
      }
    });
  }

  public setFrequency(fq: number): void {
    if (isNaN(fq)) {
      return;
    }

    fq = clamp(fq, FwdOscillatorNode.MIN_FREQ, FwdOscillatorNode.MAX_FREQ);

    const audioNow = this.fwdAudio.now();
    this.nativeNode.frequency.setValueAtTime(fq, audioNow);
  }

  public stop(): void {
    const audioNow = this.fwdAudio.now();
    this.nativeNode.stop(audioNow);
  }
}

//===============================================================

export class FwdLFONode extends FwdAudioNode {
  private readonly _output: GainNode;
  private readonly _osc: OscillatorNode;

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
}

//===============================================================

export class FwdSamplerNode extends FwdAudioNode {
  private readonly _output: GainNode;
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
  private readonly _output: AudioBufferSourceNode;

  constructor(public readonly fwdAudio: FwdAudio) {
    super();

    this._output = fwdAudio.context.createBufferSource();
    this._output.loop = true;
    this._output.buffer = this.generateWhiteNoise();
    this._output.start(0);
  }

  public get inputNode(): AudioNode { return null; }
  public get outputNode(): AudioNode { return this._output; }

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
