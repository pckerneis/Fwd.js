import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map, pluck, switchMap, take, tap } from 'rxjs/operators';

export class StoreBasedService<T> {

  public readonly completed$: Observable<void>;

  protected readonly _state$: BehaviorSubject<T>;
  protected readonly _completed$: Subject<void>;

  constructor(state: T) {
    this._state$ = new BehaviorSubject<T>(state);
    this._completed$ = new Subject<void>();
    this.completed$ = this._completed$.asObservable();
  }

  public get snapshot(): T {
    return this._state$.getValue();
  }

  public get state$(): Observable<T> { return this._state$.asObservable(); }

  public complete(): void {
    this._completed$.next();
    this._completed$.complete();
  }

  protected updateIfChanged<K extends keyof T>(key: K, value: T[K]): Observable<T> {
    return this._state$.pipe(
      take(1),
      pluck(key),
      filter(v => v != value),
      switchMap(() => this.update(key, value)),
    );
  }

  protected update<K extends keyof T>(key: K, value: T[K]): Observable<T> {
    return this._state$.pipe(
      take(1),
      map((state) => ({
        ...state,
        [key]: value,
      })),
      tap(newState => this.commit(newState)));
  }

  private commit(newState: T): void {
    this._state$.next(newState);
  }
}
