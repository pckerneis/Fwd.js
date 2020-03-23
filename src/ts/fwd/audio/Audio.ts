import { Fwd, fwd } from '../core/fwd';
import { Time } from '../core';

export class FwdAudio {
  private _fwd: Fwd;

  private _ctx: AudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  public get context(): AudioContext { return this._ctx; }

  public get master(): FwdGainNode {
    return this._masterGain;
  }

  constructor() {
    this.resetAudioContext();
  }

  initializeModule(fwd: Fwd) {
    this._fwd = fwd;
  }

  start() {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
  }

  now(): Time {
    return this._fwd.now() + this._startOffset;
  }

  private resetAudioContext() {
    this._ctx = new AudioContext();
    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);
  }

  //===============================================================================

  gain(value: number = 0) {
    this.assertInit();
    return new FwdGainNode(this, value);
  }

  osc(frequency: number = 440, type: OscillatorType = 'sine') {
    this.assertInit();
    return new FwdOscillatorNode(this, frequency, type);
  }

  lfo(frequency: number = 1, type: OscillatorType = 'sine') {
    this.assertInit();
    return new LFONode(this, frequency, type);
  }

  private assertInit() {
    if (! this._fwd) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }
}

//=========================================================================

abstract class FwdAudioNode {
  readonly inputNode: AudioNode | AudioParam;
  readonly outputNode: AudioNode;

  connect(destination: FwdAudioNode, output?: number, input?: number): FwdAudioNode {
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
  get inputNode(): AudioParam {
    return this._param;
  }

  constructor(readonly fwdAudio: FwdAudio, private _param: AudioParam) {
    super();
  }

  rampTo(value: number, time: number) {
    const audioNow = this.fwdAudio.now();
    this._param.cancelAndHoldAtTime(audioNow);
    this._param.linearRampToValueAtTime(value, audioNow + time);
  }
}

//=========================================================================

abstract class FwdAudioNodeWrapper<T extends AudioNode> extends FwdAudioNode {
  get inputNode() { return this.nativeNode; }

  get outputNode() { return this.nativeNode; }

  get nativeNode() { return this._nativeNode; }

  get fwdAudio(): FwdAudio { return this._fwdAudio; }

  private tearedDownCalled = false;

  protected constructor(private _fwdAudio: FwdAudio, private _nativeNode: T) {
    super();
  }

  tearDown() {
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

  protected assertIsReady(context: string) {
    if (this._nativeNode == null) {
      throw new Error(context + ': this audio node was teared down or unproperly initialized.');
    }
  }
}

//=========================================================================

class FwdGainNode extends FwdAudioNodeWrapper<GainNode> {
  get gain() { return new FwdAudioParamWrapper(this.fwdAudio, this.nativeNode.gain); }

  constructor(fwdAudio: FwdAudio, defaultValue: number = 0) {
    super(fwdAudio, fwdAudio.context.createGain());
    this.nativeNode.gain.setValueAtTime(defaultValue, 0);
  }

  rampTo(value: number, time: number) {
    this.gain.rampTo(value, time);
  }
}

//=========================================================================

class FwdOscillatorNode extends FwdAudioNodeWrapper<OscillatorNode> {
  setType(type: OscillatorType) {
    fwd.schedule(fwd.now(), () => {
      if (this.nativeNode !== null) {
        this.nativeNode.type = type;
      }
    });
  }

  get frequency(): FwdAudioParamWrapper {
    return new FwdAudioParamWrapper(this.fwdAudio, this.nativeNode.frequency);
  }
  
  constructor (fwdAudio: FwdAudio, freq: number, type: OscillatorType) {
    super(fwdAudio, fwdAudio.context.createOscillator());

    this.nativeNode.frequency.value = freq;
    this.nativeNode.type = type;
    this.nativeNode.start();
  }

  setFrequency(fq: number) {
    const audioNow = this.fwdAudio.now();
    this.nativeNode.frequency.setValueAtTime(fq, audioNow);
  }

  stop() {
    const audioNow = this.fwdAudio.now(); 
    this.nativeNode.stop(audioNow);
  }
}

//===============================================================

class LFONode extends FwdAudioNode {
  private _output: GainNode;
  private _osc: OscillatorNode;

  get inputNode(): AudioNode { return null; }
  get outputNode(): AudioNode { return this._output; }

  get oscillator(): OscillatorNode { return this._osc; }

  set frequency(frequency: number) {
    const audioNow = this.fwdAudio.now();
    this._osc.frequency.setValueAtTime(frequency, audioNow);
  }

  set type(type: OscillatorType) {
    fwd.schedule(fwd.now(), () => {
      this._osc.type = type;
    });
  }

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
}
