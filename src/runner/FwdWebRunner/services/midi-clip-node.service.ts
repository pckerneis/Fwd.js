import { Observable } from 'rxjs';
import { distinctUntilChanged, map, pluck, switchMap, take } from 'rxjs/operators';
import { TimeSignature } from '../NoteSequencer/note-sequencer';
import { MidiClipNodeState, MidiFlagState, MidiNoteState } from '../state/project.state';
import { GraphSequencerService } from './graph-sequencer.service';
import { StoreBasedService } from './store-based.service';

export interface MidiInlet {
  id: string;
  time: number;
  name: string;
}

export interface MidiOutlet {
  id: string;
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

export class MidiClipNodeService extends StoreBasedService<MidiClipNodeState> {
  public readonly label$: Observable<string>;
  public readonly duration$: Observable<number>;
  public readonly signature$: Observable<TimeSignature>;
  public readonly flags$: Observable<MidiFlagState[]>;
  public readonly notes$: Observable<MidiNoteState[]>;
  public readonly inlets$: Observable<MidiInlet[]>;
  public readonly outlets$: Observable<MidiOutlet[]>;

  constructor(state: MidiClipNodeState,
              public readonly graphSequencerService: GraphSequencerService) {
    super(state);

    this.label$ = this._state$.pipe(pluck('label'), distinctUntilChanged());
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
  }

  private static checkFlagKind(kind: string): kind is 'inlet' | 'outlet' {
    const knownFlags = ['none', 'inlet', 'outlet'];

    if (! knownFlags.includes(kind)) {
      throw new Error('Unknown flag kind ' + kind);
    }

    return true;
  }

  public setLabel(newLabel: string): Observable<MidiClipNodeState> {
    return this.update('label', newLabel);
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
    const updateFlags = [...this.snapshot.flags, flag];
    return this.update('flags', updateFlags);
  }

  public removeFlag(id: string): any {
    const flag = this.snapshot.flags.find(f => f.id === id);

    if (flag == null) {
      throw new Error('Cannot find flag with id ' + id);
    }

    this.graphSequencerService.disconnectPin(id).subscribe();
    return this.update('flags', this.snapshot.flags.filter(f => f.id !== id));
  }

  public renameFlag(id: string, value: string): any {
    const updatedFlags = this.updateOneFlag(id, 'name', value);
    return this.update('flags', updatedFlags);
  }

  public setFlagTime(id: string, value: number): any {
    const updatedFlags = this.updateOneFlag(id, 'time', value);
    return this.update('flags', updatedFlags);
  }

  public setFlagKind(id: string, kind: string): Observable<MidiClipNodeState> {
    if (MidiClipNodeService.checkFlagKind(kind)) {
      const existingFlag = this.snapshot.flags.find(f => f.id === id);

      if (existingFlag?.kind === 'inlet' || existingFlag?.kind === 'outlet') {
        this.graphSequencerService.disconnectPin(id).subscribe();
      }

      const updatedFlags = this.updateOneFlag(id, 'kind', kind);
      return this.update('flags', updatedFlags);
    }
  }

  public setNotes(notes: MidiNoteState[]): Observable<MidiClipNodeState> {
    return this.update('notes', notes);
  }

  private updateOneFlag<K extends keyof MidiFlagState>(id: string, key: K, value: MidiFlagState[K]): MidiFlagState[] {
    return this.snapshot.flags.map(f => (f.id === id ? {...f, [key]: value} : f));
  }
}
