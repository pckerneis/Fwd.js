import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, pluck, switchMap, take, tap } from 'rxjs/operators';

export class StoreBasedService<T> {

  protected readonly _state$: BehaviorSubject<T>;

  constructor(state: T) {
    this._state$ = new BehaviorSubject<T>(state);
  }

  public get snapshot(): T {
    return this._state$.getValue();
  }

  public get state$(): Observable<T> { return this._state$.asObservable(); }

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
