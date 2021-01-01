import { IBounds } from '../canvas/BaseComponent';
import { Note } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { TimeSignature } from '../NoteSequencer/note-sequencer';

export interface BaseNodeState {
  id: string;
  bounds: IBounds;
}

export interface InitNodeState extends BaseNodeState {
  kind: 'Init';
  label: string;
}

export interface MidiNoteState extends Note {
  time: number;
  pitch: number;
  duration: number;
  velocity: number;
}

export type FlagKind = 'inlet' | 'outlet' | 'none' | 'jump';

export interface MidiFlagState {
  id: string;
  time: number;
  name: string;
  color: string;
  kind: FlagKind;
  jumpDestination?: string;
}

export interface MidiClipNodeState extends BaseNodeState {
  kind: 'MidiClip';
  label: string;
  notes: MidiNoteState[];
  flags: MidiFlagState[];
  duration: number;
  timeSignature: TimeSignature;
}

export type NodeState = MidiClipNodeState | InitNodeState;

export interface ConnectionState {
  sourceNode: string;
  sourcePinId: string;
  targetNode: string;
  targetPinId: string;
}

export interface GraphSequencerState {
  nodes: NodeState[];
  connections: ConnectionState[];
}

export interface ProjectState {
  graphSequencer: GraphSequencerState;
}
