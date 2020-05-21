import { Time } from "../core/EventQueue/EventQueue";
import { Fwd } from "../core/fwd";
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
}

export interface FwdAudio {
  listeners: Partial<FwdAudioListener>[];
  readonly isContextReady: boolean;
  context: AudioContext;
  readonly master: FwdGainNode;

  initializeModule(fwd: Fwd): void;
  start(): void;
  now(): Time;

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
