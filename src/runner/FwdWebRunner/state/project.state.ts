import { IBounds } from '../canvas/BaseComponent';
import { TimeSignature } from '../NoteSequencer/note-sequencer';

export interface BaseNodeState {
  id: string;
  bounds: IBounds;
}

export interface MidiNoteState {
  time: number;
  pitch: number;
  duration: number;
  velocity: number;
}

export interface MidiFlagState {
  time: number;
  name: string;
  color: string;
}

export interface MidiClipNodeState extends BaseNodeState {
  kind: 'MidiClip';
  label: string;
  notes: MidiNoteState[];
  flags: MidiFlagState[];
  duration: number;
  timeSignature: TimeSignature;
}

export type NodeState = MidiClipNodeState;

export interface ConnectionState {
  sourceNode: string;
  sourcePinIndex: number;
  targetNode: string;
  targetPinIndex: number;
}

export interface GraphSequencerState {
  nodes: NodeState[];
  connections: ConnectionState[];
}

export interface ProjectState {
  graphSequencer: GraphSequencerState;
}
