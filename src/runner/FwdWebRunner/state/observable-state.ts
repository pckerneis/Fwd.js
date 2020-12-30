type Callback = (value: any) => void;

type Path<T> = keyof T | [keyof T, { [K in keyof T]: Path<T[K]> }[keyof T]];

interface Listener<T> {
  path: Path<T>;
  callback: Callback;
}

export class ObservableState<T> {
  private readonly _state: T;

  private readonly listeners: Listener<T>[] = [];

  constructor(state: T) {
    this._state = state;
  }

  public observe(callback: Callback, path: Path<T>): void {
    this.listeners.push({ path, callback });
  }

  public changed(path: Path<T>): void {
    this.listeners
      .filter(listener => this.isObserving(listener, path))
      .forEach(listener => {
        listener.callback(this.pluck(path));
      });
  }

  private isObserving(listener: Listener<T>, path: Path<T>): boolean {
    return arePathEquals(listener.path, path);
  }

  private pluck(path: Path<T>): any {
    if (! Array.isArray(path)) {
      return this._state[path];
    } else {
      // We get an typing error on next line because of potentially infinite recursion
      // @ts-ignore
      return path.reduce((acc, curr) => acc[curr], this._state);
    }
  }
}

function arePathEquals<T>(first: Path<T>, second: Path<T>): boolean {
  if (! Array.isArray(first)) {
    return first === second;
  } else if (Array.isArray(second)) {
    if (first.length !== second.length) {
      return false;
    }

    for (let idx = 0; idx < first.length; ++idx) {
      if (first[idx] != second[idx]) {
        return false;
      }
    }
  } else {
    return false;
  }

  return true;
}
