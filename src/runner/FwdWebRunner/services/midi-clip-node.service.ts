import { Observable } from 'rxjs';
import { pluck, switchMap, take } from 'rxjs/operators';
import { TimeSignature } from '../NoteSequencer/note-sequencer';
import { MidiClipNodeState, MidiFlagState, MidiNoteState } from '../state/project.state';
import { StoreBasedService } from './store-based.service';

export class MidiClipNodeService extends StoreBasedService<MidiClipNodeState> {
  public readonly label$: Observable<string>;
  public readonly duration$: Observable<number>;
  public readonly signature$: Observable<TimeSignature>;
  public readonly flags$: Observable<MidiFlagState[]>;
  public readonly notes$: Observable<MidiNoteState[]>;

  constructor(state: MidiClipNodeState) {
    super(state);

    this.label$ = this._state$.pipe(pluck('label'));
    this.duration$ = this._state$.pipe(pluck('duration'));
    this.signature$ = this._state$.pipe(pluck('timeSignature'));
    this.flags$ = this._state$.pipe(pluck('flags'));
    this.notes$ = this._state$.pipe(pluck('notes'));
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

  public removeFlagAt(idx: number): any {
    const updatedFlags = [...this.snapshot.flags];
    updatedFlags.splice(idx, 1);
    return this.update('flags', updatedFlags);
  }

  public renameFlagAt(idx: number, value: string): any {
    const updatedFlags = [...this.snapshot.flags];

    if (Boolean(updatedFlags[idx])) {
      updatedFlags[idx].name = value;
    }

    return this.update('flags', updatedFlags);
  }

  public setFlagTime(idx: number, value: number): any {
    const updatedFlags = [...this.snapshot.flags];

    if (Boolean(updatedFlags[idx])) {
      updatedFlags[idx].time = value;
    }

    return this.update('flags', updatedFlags);
  }

  public setNotes(notes: MidiNoteState[]): Observable<MidiClipNodeState> {
    return this.update('notes', notes);
  }

}
