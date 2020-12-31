type Callback = (value: any) => void;

interface Listener<T> {
  path: keyof T;
  callback: Callback;
}

export class ObservableState<T> {
  private readonly _state: T;

  private readonly listeners: Listener<T>[] = [];

  constructor(state: T) {
    this._state = state;
  }

  public get(): T {
    return this._state;
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
    this._state[path] = value;
    this.changed(path);
    return this.pluck(path);
  }

  private isObserving(listener: Listener<T>, path: keyof T): boolean {
    return listener.path === path;
  }

  private pluck(path: keyof T): any {
    return this._state[path];
  }
}
