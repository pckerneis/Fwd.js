import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, pluck, switchMap, take } from 'rxjs/operators';
import { Rectangle } from '../canvas/Rectangle';
import { TimeSignature } from '../NoteSequencer/note-sequencer';
import { FlagKind, MidiClipNodeState, MidiFlagState, MidiNoteState, NodeState } from '../state/project.state';
import { GraphSequencerService } from './graph-sequencer.service';
import { SequenceGenerator } from './sequence-generator';
import { StoreBasedService } from './store-based.service';

export interface MidiInlet {
  id: number;
  time: number;
  name: string;
}

export interface MidiOutlet {
  id: number;
  time: number;
  name: string;
}

function areArraysEqual(first: Array<any>, second: Array<any>): boolean {
  if (! Array.isArray(first) || ! Array.isArray(second)) {
    return false;
  }

  if (first.length != second.length) {
    return false;
  }

  for (let i = 0; i < first.length; ++i) {
    if (first[i] != second[i]) {
      return false;
    }
  }

  return true;
}

export class NodeService<T extends NodeState> extends StoreBasedService<T> {
  public readonly label$: Observable<string>;

  constructor(state: T) {
    super(state);

    this.label$ = this._state$.pipe(pluck('label'), distinctUntilChanged());
  }

  public setLabel(newLabel: string): Observable<T> {
    return this.update('label', newLabel);
  }

  public setBounds(bounds: Rectangle): Observable<T> {
    return this.update('bounds', bounds);
  }

  public setSelected(selected: boolean): Observable<T> {
    return this.update('selected', selected);
  }
}

export class MidiClipNodeService extends NodeService<MidiClipNodeState> {
  public readonly duration$: Observable<number>;
  public readonly signature$: Observable<TimeSignature>;
  public readonly flags$: Observable<MidiFlagState[]>;
  public readonly notes$: Observable<MidiNoteState[]>;
  public readonly inlets$: Observable<MidiInlet[]>;
  public readonly outlets$: Observable<MidiOutlet[]>;
  public readonly playPosition$: Observable<number>;

  private readonly _idSequence: SequenceGenerator = new SequenceGenerator();
  private readonly _playPositionSubject$: Subject<number>;

  constructor(state: MidiClipNodeState,
              public readonly graphSequencerService: GraphSequencerService) {
    super(state);

    this.duration$ = this._state$.pipe(pluck('duration'), distinctUntilChanged());
    this.signature$ = this._state$.pipe(pluck('timeSignature'), distinctUntilChanged());
    this.flags$ = this._state$.pipe(pluck('flags'), distinctUntilChanged(areArraysEqual));
    this.notes$ = this._state$.pipe(pluck('notes'), distinctUntilChanged(areArraysEqual));

    this.inlets$ = this.flags$.pipe(map(flags => flags
      .filter(f => f.kind === 'inlet')
      .map(f => ({time: f.time, name: f.name, id: f.id}))));

    this.outlets$ = this.flags$.pipe(map(flags => flags
      .filter(f => f.kind === 'outlet')
      .map(f => ({time: f.time, name: f.name, id: f.id}))));

    this._playPositionSubject$ = new Subject<number>();
    this.playPosition$ = this._playPositionSubject$.asObservable();
  }

  private static checkFlagKind(kind: string): kind is FlagKind {
    const knownFlags = ['none', 'inlet', 'outlet', 'jump'];

    if (! knownFlags.includes(kind)) {
      throw new Error('Unknown flag kind ' + kind);
    }

    return true;
  }

  public setDuration(newDuration: number): Observable<MidiClipNodeState> {
    return this.update('duration', newDuration);
  }

  public setSignatureUpper(upper: number): Observable<MidiClipNodeState> {
    return this._state$.pipe(
      take(1),
      pluck('timeSignature'),
      switchMap((sign) => this.update('timeSignature', {...sign, upper})),
    );
  }

  public setSignatureLower(lower: number): Observable<MidiClipNodeState> {
    return this._state$.pipe(
      take(1),
      pluck('timeSignature'),
      switchMap((sign) => this.update('timeSignature', {...sign, lower})),
    );
  }

  public addFlag(flag: MidiFlagState): Observable<MidiClipNodeState> {
    flag.id = this._idSequence.next();
    const updateFlags = [...this.snapshot.flags, flag];
    return this.update('flags', updateFlags);
  }

  public removeFlag(id: number): any {
    const flag = this.snapshot.flags.find(f => f.id === id);

    if (flag == null) {
      throw new Error('Cannot find flag with id ' + id);
    }

    this.graphSequencerService.disconnectPin(id).subscribe();
    return this.update('flags', this.snapshot.flags.filter(f => f.id !== id));
  }

  public renameFlag(id: number, value: string): any {
    const updatedFlags = this.updateOneFlag(id, 'name', value);
    return this.update('flags', updatedFlags);
  }

  public setFlagTime(id: number, value: number): any {
    const updatedFlags = this.updateOneFlag(id, 'time', value);
    return this.update('flags', updatedFlags);
  }

  public setFlagKind(id: number, kind: string): Observable<MidiClipNodeState> {
    if (MidiClipNodeService.checkFlagKind(kind)) {
      const existingFlag = this.snapshot.flags.find(f => f.id === id);

      if (existingFlag?.kind === 'inlet' || existingFlag?.kind === 'outlet') {
        this.graphSequencerService.disconnectPin(id).subscribe();
      }

      const updatedFlags = this.updateOneFlag(id, 'kind', kind);
      return this.update('flags', updatedFlags);
    }
  }

  public setFlagJumpDestination(id: number, destination: number): any {
    const updatedFlags = this.updateOneFlag(id, 'jumpDestination', destination);
    return this.update('flags', updatedFlags);
  }

  public setNotes(notes: MidiNoteState[]): Observable<MidiClipNodeState> {
    return this.update('notes', notes);
  }

  public setMidiClipPlayPosition(position: number): void {
    this._playPositionSubject$.next(position);
  }

  private updateOneFlag<K extends keyof MidiFlagState>(id: number, key: K, value: MidiFlagState[K]): MidiFlagState[] {
    return this.snapshot.flags.map(f => (f.id === id ? {...f, [key]: value} : f));
  }
}