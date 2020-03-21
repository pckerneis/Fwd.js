import { Fwd } from '../core/fwd';
import { Time } from '../core';

export class FwdAudio {
  private _fwd: Fwd;

  private _ctx: AudioContext = new AudioContext();

  private _startOffset: Time;

  public get context(): AudioContext { return this._ctx; }

  public get destination(): AudioDestinationNode {
    return this._ctx.destination;
  }

  constructor() {
  }

  initializeModule(fwd: Fwd) {
    this._fwd = fwd;
  }

  start() {
    this._startOffset = this._ctx.currentTime;
  }

  now(): Time {
    return this._fwd.now() - this._startOffset;
  }

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





abstract class FwdAudioNodeWrapper<T extends AudioNode> {

  get nativeNode() { return this._nativeNode; }

  get fwdAudio(): FwdAudio { return this._fwdAudio; }

  protected constructor(private _fwdAudio: FwdAudio, private _nativeNode: T) {
  }

  connect(destination: FwdAudioNodeWrapper<any> | AudioNode | AudioParam, output?: number, input?: number): AudioNode | null {
    if (destination instanceof FwdAudioNodeWrapper) {
      return this._nativeNode.connect(
        destination._nativeNode, 
        output, 
        input);
    } else if (destination instanceof AudioNode) {
      return this._nativeNode.connect(
        destination, 
        output, 
        input);
    } else {
      this._nativeNode.connect(
        destination, 
        output);
      return null;
    }
  }
}






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