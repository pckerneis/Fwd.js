import { Time } from "../core/EventQueue/EventQueue";
import { Fwd } from "../core/fwd";
import { FwdAudioTrack } from "./nodes/FwdAudioTrack";
import { FwdGainNode, FwdLFONode, FwdNoiseNode, FwdOscillatorNode, FwdSamplerNode } from "./nodes/StandardAudioNodes";

export interface FwdAudioListener {
  audioContextStarted(context: AudioContext): void;
  audioTrackAdded(track: FwdAudioTrack): void;
  audioTrackRemoved(track: FwdAudioTrack): void;
}

export interface FwdAudio {
  listeners: FwdAudioListener[];
  readonly isContextReady: boolean;
  readonly context: AudioContext;
  readonly master: FwdGainNode;

  initializeModule(fwd: Fwd): void;
  start(): void;
  now(): Time;

  addTrack(trackName: string): FwdAudioTrack;
  removeTrack(trackName: string): void;
  getTrack(trackName: string): FwdAudioTrack;

  soloTrack(trackName: string): void;
  unsoloAllTracks(): void;

  gain(value?: number ): FwdGainNode;
  osc(frequency?: number, type?: OscillatorType): FwdOscillatorNode;
  lfo(frequency?: number, type?: OscillatorType): FwdLFONode;
  sampler(pathToFile: string): FwdSamplerNode;
  noise(): FwdNoiseNode;
}