import { Time } from "../scheduler/EventQueue/EventQueue";
import { FwdScheduler } from '../scheduler/FwdScheduler';
// TODO break circular dependency
import {
  FwdBufferNode,
  FwdCompressorNode,
  FwdDelayLineNode,
  FwdDistortionNode,
  FwdGainNode,
  FwdLFONode,
  FwdNoiseNode,
  FwdOscillatorNode,
  FwdReverbNode,
  FwdSamplerNode,
  FwdStereoDelayNode,
} from './nodes/StandardAudioNodes';

export interface FwdAudio {
  context: AudioContext | OfflineAudioContext;
  readonly isContextReady: boolean;
  readonly master: GainNode;
  readonly fwdScheduler: FwdScheduler;
  readonly utils: FwdAudioUtils;

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
  bufferNode(buffer: AudioBuffer): FwdBufferNode;
  // convolver
  // filters
  // - highPass
  // - lowPass
  // - bandPass
  // - allPass

}

export interface FwdAudioUtils {
  decibelsToGain(decibels: number): number;
  gainToDecibels(gain: number): number;

  bufferToWave(audioBuffer: AudioBuffer, offset?: number, length?: number): Blob;
  downloadFile(blob: Blob, fileName: string): void;
}
