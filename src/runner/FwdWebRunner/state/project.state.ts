import { IRectangle } from '../canvas/Rectangle';
import { Note } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { TimeSignature } from '../NoteSequencer/note-sequencer';

export interface BaseNodeState {
  id: number;
  bounds: IRectangle;
  selected: boolean;
}

export interface InitNodeState extends BaseNodeState {
  kind: 'Init';
  label: string;
  outletId: number;
}

export interface MidiNoteState extends Note {
  time: number;
  pitch: number;
  duration: number;
  velocity: number;
}

export type FlagKind = 'inlet' | 'outlet' | 'none' | 'jump';

export interface MidiFlagState {
  id: number;
  time: number;
  name: string;
  color: string;
  kind: FlagKind;
  jumpDestination?: number;
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
  sourceNode: number;
  sourcePinId: number;
  targetNode: number;
  targetPinId: number;
  selected: boolean;
}

export interface GraphSequencerState {
  nodes: NodeState[];
  connections: ConnectionState[];
}

export interface ProjectState {
  graphSequencer: GraphSequencerState;
}
