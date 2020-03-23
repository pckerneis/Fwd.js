import { Time } from '../core';
import { Fwd, fwd } from '../core/fwd';

export class FwdAudio {
  private _fwd: Fwd;

  private _ctx: AudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  constructor() {
    this.resetAudioContext();
  }

  public get context(): AudioContext { return this._ctx; }

  public get master(): FwdGainNode {
    return this._masterGain;
  }

  public initializeModule(fwd: Fwd): void {
    this._fwd = fwd;
  }

  public start(): void {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
  }

  public now(): Time {
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

  public lfo(frequency: number = 1, type: OscillatorType = 'sine'): LFONode {
    this.assertInit();
    return new LFONode(this, frequency, type);
  }

  private resetAudioContext(): void {
    this._ctx = new AudioContext();
    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);
  }

  private assertInit(): void {
    if (! this._fwd) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }
}

//=========================================================================

abstract class FwdAudioNode {
  public inputNode: AudioNode | AudioParam;
  public outputNode: AudioNode;

  public connect(destination: FwdAudioNode, output?: number, input?: number): FwdAudioNode {
    if (this.outputNode == null || destination.inputNode == null) {
      throw new Error('Error while trying to connect the audio node');
    }
    
    if (destination.inputNode instanceof AudioNode) {
      this.outputNode.connect(destination.inputNode, output, input);
    } else {
      this.outputNode.connect(destination.inputNode, output);
    }

    return destination;
  }
}

//=========================================================================

class FwdAudioParamWrapper extends FwdAudioNode {

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

abstract class FwdAudioNodeWrapper<T extends AudioNode> extends FwdAudioNode {

  private tearedDownCalled: boolean = false;

  protected constructor(private _fwdAudio: FwdAudio, private _nativeNode: T) {
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
      throw new Error(context + ': this audio node was teared down or unproperly initialized.');
    }
  }
}

//=========================================================================

class FwdGainNode extends FwdAudioNodeWrapper<GainNode> {
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

class FwdOscillatorNode extends FwdAudioNodeWrapper<OscillatorNode> {
  
  constructor (fwdAudio: FwdAudio, freq: number, type: OscillatorType) {
    super(fwdAudio, fwdAudio.context.createOscillator());

    this.nativeNode.frequency.value = freq;
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
    const audioNow = this.fwdAudio.now();
    this.nativeNode.frequency.setValueAtTime(fq, audioNow);
  }

  public stop(): void {
    const audioNow = this.fwdAudio.now(); 
    this.nativeNode.stop(audioNow);
  }
}

//===============================================================

class LFONode extends FwdAudioNode {
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
