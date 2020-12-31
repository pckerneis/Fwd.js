type Callback = (value: any) => void;

interface Listener<T> {
  path: keyof T;
  callback: Callback;
}

export class ObservableState<T> {
  protected readonly _ownedState: T;
  protected readonly _stateAccessor: Function;

  protected readonly listeners: Listener<T>[] = [];

  constructor(state: T | (() => T)) {
    if (typeof state === 'object') {
      this._ownedState = state;
    } else if (typeof state === 'function') {
      this._stateAccessor = state;
    } else {
      throw new Error('bad state');
    }
  }

  public get(): T {
    return this._ownedState || this._stateAccessor();
  }

  public observe(callback: Callback, path: keyof T): void {
    this.listeners.push({ path, callback });
  }

  public changed(path: keyof T): void {
    this.listeners
      .filter(listener => this.isObserving(listener, path))
      .forEach(listener => {
        listener.callback(this.pluck(path));
      });
  }

  public update<R>(value: any, path: keyof T): R {
    this.get()[path] = value;
    this.changed(path);
    return this.pluck(path);
  }

  public listObserver<I>(path: keyof T): ObservableListState<I> {
    return new ObservableListState<any>(() => this.get()[path]);
  }

  public innerObserver<K extends keyof T, R extends T[K]>(path: K): ObservableState<any> {
    return new ObservableState<any>(() => this.get()[path]);
  }

  private isObserving(listener: Listener<T>, path: keyof T): boolean {
    return listener.path === path;
  }

  private pluck(path: keyof T): any {
    return this.get()[path];
  }
}

export class ObservableListState<I> extends ObservableState<I[]> {
  protected readonly addItemListeners: Callback[] = [];

  constructor(listAccessor: () => any) {
    super(listAccessor);
  }

  public add(item: I): ObservableState<I> {
    this.get().push(item);
    const obs = new ObservableState<I>(() => item);
    this.addItemListeners.forEach((cb) => cb(obs));
    return obs;
  }

  public observeAdd(callback: Callback): void {
    this.addItemListeners.push(callback)
  }
}
