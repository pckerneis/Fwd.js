import { Time } from "../core/EventQueue/EventQueue";
import { Fwd } from "../core/fwd";
import { FwdAudioTrack, FwdAudioTrackOptions } from "./nodes/FwdAudioTrack";
import {
  FwdCompressorNode,
  FwdDelayLineNode,
  FwdDistortionNode,
  FwdGainNode,
  FwdLFONode,
  FwdNoiseNode,
  FwdOscillatorNode,
  FwdSamplerNode,
  FwdStereoDelayNode,
} from "./nodes/StandardAudioNodes";

export interface FwdAudioListener {
  audioContextStarted(context: AudioContext): void;
  audioTrackAdded(track: FwdAudioTrack): void;
  audioTrackRemoved(track: FwdAudioTrack): void;
}

export interface FwdAudio {
  listeners: Partial<FwdAudioListener>[];
  readonly isContextReady: boolean;
  context: AudioContext;
  readonly master: FwdGainNode;
  readonly tracks: FwdAudioTrack[];
  readonly soloedTrack: string;

  initializeModule(fwd: Fwd): void;
  start(): void;
  now(): Time;

  addTrack(trackName: string, options?: Partial<FwdAudioTrackOptions>): FwdAudioTrack;
  removeTrack(trackName: string): void;
  getTrack(trackName: string): FwdAudioTrack;

  soloTrack(trackName: string): void;
  unsoloAllTracks(): void;

  gain(value?: number ): FwdGainNode;
  osc(frequency?: number, type?: OscillatorType): FwdOscillatorNode;
  lfo(frequency?: number, type?: OscillatorType): FwdLFONode;
  sampler(pathToFile: string): FwdSamplerNode;
  noise(): FwdNoiseNode;
  delayLine(initialDelayTime: number): FwdDelayLineNode;
  stereoDelay(): FwdStereoDelayNode;
  distortion(amount: number): FwdDistortionNode;
  compressor(): FwdCompressorNode;
}
