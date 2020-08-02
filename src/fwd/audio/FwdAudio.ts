import { Time } from "../core/EventQueue/EventQueue";
import { FwdScheduler } from '../core/FwdScheduler';
import {
  FwdCompressorNode,
  FwdDelayLineNode,
  FwdDistortionNode,
  FwdGainNode,
  FwdLFONode,
  FwdNoiseNode,
  FwdOscillatorNode, FwdReverbNode,
  FwdSamplerNode,
  FwdStereoDelayNode,
} from './nodes/StandardAudioNodes';

export interface FwdAudio {
  readonly isContextReady: boolean;
  context: AudioContext | OfflineAudioContext;
  readonly master: GainNode;
  readonly fwdScheduler: FwdScheduler;

  start(): void;
  now(): Time;

  startOffline(duration: number, sampleRate?: number): OfflineAudioContext;

  gain(value?: number): FwdGainNode;
  osc(frequency?: number, type?: OscillatorType): FwdOscillatorNode;
  lfo(frequency?: number, type?: OscillatorType): FwdLFONode;
  sampler(pathToFile: string): FwdSamplerNode;
  noise(): FwdNoiseNode;
  delayLine(initialDelayTime: number): FwdDelayLineNode;
  stereoDelay(): FwdStereoDelayNode;
  distortion(amount: number): FwdDistortionNode;
  compressor(): FwdCompressorNode;
  reverb(reverbTime?: number, preDelayTime?: number): FwdReverbNode;
  // convolver
  // filters
  // - highPass
  // - lowPass
  // - bandPass
  // - allPass
}
