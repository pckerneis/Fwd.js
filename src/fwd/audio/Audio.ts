import path from 'path';
import { Time } from '../core/EventQueue/EventQueue';
import { Fwd, fwd } from '../core/Fwd';
import { decibelsToGain, gainToDecibels } from '../core/utils/decibels';
import { clamp } from '../core/utils/numbers';

const DBG = (...messages: string[]) => console.log(...messages);

export interface FwdAudioListener {
  audioContextStarted(context: AudioContext): void;
  audioTrackAdded(track: FwdAudioTrack): void;
  audioTrackRemoved(track: FwdAudioTrack): void;
}

export class FwdAudio {
  public readonly listeners: FwdAudioListener[] = [];

  private _fwd: Fwd;

  private _ctx: AudioContext;

  private _masterGain: FwdGainNode;

  private _startOffset: Time = 0;

  private _tracks: Map<string, FwdAudioTrack>;

  private _soloTrack: string = null;

  constructor(private _contextReady: boolean = false) {
    // this.resetAudioContext();
    this._tracks = new Map<string, FwdAudioTrack>();
  }

  public get isContextReady(): boolean {
    return this._contextReady;
  }

  public get context(): AudioContext { return this._ctx; }

  public get master(): FwdGainNode {
    return this._masterGain;
  }

  public initializeModule(fwd: Fwd): void {
    this._fwd = fwd;
  
    this._fwd.scheduler.timeProvider = () => {
      return this._ctx.currentTime * 1000;
    }
  }

  public start(): void {
    this.resetAudioContext();
    this._startOffset = this._ctx.currentTime;
  }

  public now(): Time {
    return this._fwd.now() + this._startOffset;
  }

  //===============================================================================

  public addTrack(trackName: string): FwdAudioTrack {
    if (this.getTrack(trackName) != null) {
      fwd.err(`A track already exists with the name ${trackName}.`);
      return null;
    }

    const track = new FwdAudioTrack(this, trackName);
    this._tracks.set(trackName, track);

    if (this.isContextReady && this._soloTrack !== null) {
      track['_muteForSolo']();
    }

    this.listeners.forEach(l => l.audioTrackAdded(track));

    return track;
  }

  public removeTrack(trackName: string): FwdAudioTrack {
    const track = this.getTrack(trackName);

    if (track === null) {
      fwd.err(`The track ${trackName} doesn't exist.`);
      return;
    }
    
    track.tearDown();
    
    // Unsolo that track
    if (this._soloTrack === trackName) {
      this._tracks.forEach(t => t['_unmuteForSolo']);
    }

    this.listeners.forEach(l => l.audioTrackRemoved(track));
  }

  public getTrack(trackName: string): FwdAudioTrack {
    return this._tracks.get(trackName);
  }

  public soloTrack(trackName: string): void {
    const track = this.getTrack(trackName);

    if (track === null) {
      fwd.err(`The track ${trackName} doesn't exist.`);
      return;
    }

    this._tracks.forEach((track) => {
      if (track.trackName === trackName) {
        track['_unmuteForSolo']();
      } else {
        track['_muteForSolo']();
      }
    });

    if (this._soloTrack !== null) {
      DBG('soloTrack(): transmit unsolo event for previous solo track', this._soloTrack);
      this._tracks.get(this._soloTrack).listeners.forEach((l) => l.onTrackUnsolo());
    }

    this._soloTrack = trackName;
    track.listeners.forEach((l) => l.onTrackSolo());
  }

  public unsoloAllTracks(): void {
    if (this._soloTrack !== null) {
      this._tracks.forEach((t) => t['_unmuteForSolo']());
      DBG('unsoloAllTracks: _unmuteForSolo called');
      this._tracks.get(this._soloTrack).listeners.forEach((l) => {
        l.onTrackUnsolo();
        DBG('unsoloAllTracks: transmit unsolo event');
      });
      this._soloTrack = null;
    }
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

  //=========================================================================

  private resetAudioContext(): void {
    this._ctx = new AudioContext();

    if (this.isContextReady) {
      this._tracks.forEach(t => t.tearDown());
    }

    this._contextReady = true;

    this._tracks.forEach(track => {
      this.listeners.forEach(l => l.audioTrackRemoved(track));
    });
    this._tracks = new Map<string, FwdAudioTrack>();

    this._masterGain = new FwdGainNode(this, 0.5);
    this._masterGain.nativeNode.connect(this._ctx.destination);

    this.listeners.forEach(l => l.audioContextStarted(this._ctx));
  }

  private assertInit(): void {
    if (! this._fwd) {
      throw new Error('The module FwdAudio wasn\'t properly initialized!');
    }
  }
}

//=========================================================================

export abstract class FwdAudioNode {
  public abstract inputNode: AudioNode | AudioParam;
  public abstract outputNode: AudioNode;
  public abstract readonly fwdAudio: FwdAudio;

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

  public connectToMaster(): this {
    if (this.outputNode == null) {
      throw new Error('Error while trying to connect the audio node');
    }

    this.connect(this.fwdAudio.master);
    return this;
  }
}

//=========================================================================

export interface FwdAudioTrackListener {
  onTrackMute: Function,
  onTrackUnmute: Function,
  onTrackSolo: Function,
  onTrackUnsolo: Function,
}

export class FwdAudioTrack extends FwdAudioNode {

  public readonly listeners: FwdAudioTrackListener[] = [];

  private _audioReady: boolean = false;
  private _tornDown: boolean = false;

  private _muteForSoloGainNode: GainNode;
  private _muteGainNode: GainNode;
  private _panNode: StereoPannerNode;
  private _postGainNode: GainNode;

  constructor(public readonly fwdAudio: FwdAudio, public readonly trackName: string) {
    super();

    if (this.fwdAudio.isContextReady) {
      this.prepareAudio();
    } else {
      this.fwdAudio.listeners.push({
        audioContextStarted: () => this.prepareAudio(),
        audioTrackAdded: () => {},
        audioTrackRemoved: () => {},
      });
    }
  }

  public get inputNode(): AudioNode { return this._muteForSoloGainNode; }
  public get outputNode(): AudioNode { return this._panNode; }

  public get audioIsReady(): boolean { return this._audioReady; }
  public get wasTornDown(): boolean { return this._tornDown; }

  public get gain(): number {
    this.assertReady();
    return this._postGainNode.gain.value;
  }

  public set gain(value: number) {
    this.assertNotTornDown();
    const clamped = clamp(value, 0, 1);
    this.setValueSmoothed(this._postGainNode.gain, clamped);
  }

  public get volume(): number {
    this.assertReady();
    return gainToDecibels(this._postGainNode.gain.value);
  }

  public set volume(dB: number) {
    this.gain = decibelsToGain(dB);
  }

  public set pan(value: number) {
    this.assertReady();
    const clamped = clamp(value, -1, 1);
    this.setValueSmoothed(this._panNode.pan, clamped);
  }

  public solo(): void {
    this.assertReady();
    this.fwdAudio.soloTrack(this.trackName);
  }

  public unsolo(): void {
    this.assertReady();
    // this.fwdAudio.unsoloTrack(this.trackName)
    // TODO: replace with previous line when multi-soloing is implemented
    this.fwdAudio.unsoloAllTracks();
  }

  public mute(): void {
    this.setValueSmoothed(this._postGainNode.gain, 0);
    this.listeners.forEach((l) => l.onTrackMute());
  }

  public unmute(): void {
    this.setValueSmoothed(this._postGainNode.gain, 1);
    this.listeners.forEach((l) => l.onTrackUnmute());
  }

  public tearDown(): void {
    this.assertReady();

    this._muteForSoloGainNode.disconnect();
    this._muteGainNode.disconnect();
    this._panNode.disconnect();
    this._postGainNode.disconnect();
    
    this._tornDown = true;
  }

  //=========================================================================

  private prepareAudio(): void {
    if (this._audioReady) {
      return;
    }

    this._muteForSoloGainNode = this.fwdAudio.context.createGain();
    this._muteGainNode = this.fwdAudio.context.createGain();
    this._panNode = this.fwdAudio.context.createStereoPanner();
    this._postGainNode = this.fwdAudio.context.createGain();

    this._muteForSoloGainNode.gain.value = 1;
    this._muteGainNode.gain.value = 1;
    this._postGainNode.gain.value = 1;

    this._muteForSoloGainNode
      .connect(this._muteGainNode)
      .connect(this._postGainNode)
      .connect(this._panNode)
      .connect(this.fwdAudio.master.nativeNode);

    this._audioReady = true;
  }

  private _muteForSolo(): void {
    DBG('mute for solo');
    this.setValueSmoothed(this._muteForSoloGainNode.gain, 0);
  }

  private _unmuteForSolo(): void {
    DBG('unmute for solo');
    this.setValueSmoothed(this._muteForSoloGainNode.gain, 1);
  }

  private setValueSmoothed(audioParam: AudioParam, value: number): void {
    new FwdAudioParamWrapper(this.fwdAudio, audioParam).rampTo(value, 0.005);
  }

  private assertReady(): void {
    this.assertInitialized();
    this.assertNotTornDown();
  }

  private assertInitialized(): void {
    if (! this._audioReady) {
      throw new Error(`The track ${this.trackName} wasn't initialized.`);
    }
  }

  private assertNotTornDown(): void {
    if (this._tornDown) {
      throw new Error(`The track ${this.trackName} was removed.`);
    }
  }
}

//=========================================================================

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