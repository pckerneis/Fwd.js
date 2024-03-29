import { IRectangle } from '../canvas/Rectangle';
import { Note } from '../NoteSequencer/canvas-components/NoteGridComponent';
import { TimeSignature } from '../NoteSequencer/note-sequencer';

export interface BaseGraphItemState {
  id: number;
}

export interface BaseNodeState extends BaseGraphItemState {
  bounds: IRectangle;
  selected: boolean;
}

export interface InitNodeState extends BaseNodeState {
  script: string;
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

export interface InternalMidiDestinationState {
  midiChannel: 'ALL' | number;
  kind: 'Internal';
}

export interface ExternalMidiDestinationState {
  midiChannel: 'ALL' | number;
  kind: 'External';
  deviceName: string;
  deviceId: string;
}

export type MidiDestinationState = InternalMidiDestinationState | ExternalMidiDestinationState;

export interface MidiClipNodeState extends BaseNodeState {
  kind: 'MidiClip';
  label: string;
  notes: MidiNoteState[];
  flags: MidiFlagState[];
  duration: number;
  timeSignature: TimeSignature;
  destination: MidiDestinationState;
}

export type NodeState = MidiClipNodeState | InitNodeState;

export type GraphItemState = NodeState | ConnectionState;

export interface ConnectionState extends BaseGraphItemState {
  kind: 'Connection'
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
