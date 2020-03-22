import { Fwd } from '../core/fwd';
import { Time } from '../core';

export class FwdAudio {
  private _fwd: Fwd;

  private _ctx: AudioContext;;

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

  osc(frequency: number = 440, type: OscillatorType = 'sine', start = true) {
    this.assertInit();
    return new FwdOscillatorNode(this, frequency, type, start);
  }

  private assertInit() {
    if (! this._fwd) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }
}

//=========================================================================

abstract class FwdAudioNodeWrapper<T extends AudioNode> {

  get nativeNode() { return this._nativeNode; }

  get fwdAudio(): FwdAudio { return this._fwdAudio; }

  private tearedDownCalled = false;

  protected constructor(private _fwdAudio: FwdAudio, private _nativeNode: T) {
  }

  connect(destination: FwdAudioNodeWrapper<any>, output?: number, input?: number): FwdAudioNodeWrapper<any> {
    if (this._nativeNode == null) {
      throw new Error('Error while trying to connect the audio node');
    }
    
    this._nativeNode.connect(
      destination._nativeNode, 
      output, 
      input);

    return destination;
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
  constructor(fwdAudio: FwdAudio, defaultValue: number = 0) {
    super(fwdAudio, fwdAudio.context.createGain());
    this.nativeNode.gain.setValueAtTime(defaultValue, 0);
  }

  rampTo(value: number, time: number) {
    const audioNow = this.fwdAudio.now();
    this.nativeNode.gain.cancelAndHoldAtTime(audioNow);
    this.nativeNode.gain.linearRampToValueAtTime(value, audioNow + time);
  }
}

//=========================================================================

class FwdOscillatorNode extends FwdAudioNodeWrapper<OscillatorNode> {
  set oscillatorType(type: OscillatorType) {
    this.nativeNode.type = type;
  }

  set frequency(fq: number) {
    this.nativeNode.frequency.setValueAtTime(fq, 0);
  }

  rampTo(value: number, time: number) {
    const audioNow = this.fwdAudio.now();
    this.nativeNode.frequency.cancelAndHoldAtTime(audioNow);
    this.nativeNode.frequency.linearRampToValueAtTime(value, audioNow + time);
  }
  
  constructor(
    fwdAudio: FwdAudio,
    freq: number = 440,
    type: OscillatorType = 'sine',
    start = true
  ) {
    super(fwdAudio, fwdAudio.context.createOscillator());

    this.frequency = freq;
    this.oscillatorType = type;
    
    if (start) {
      this.nativeNode.start();
    }
  }

  stop() {
    const audioNow = this.fwdAudio.now(); 
    this.nativeNode.stop(audioNow);
  }
}
