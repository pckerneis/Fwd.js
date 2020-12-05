// Adapted from gvergnaud/lazy-list.js
// https://gist.github.com/gvergnaud/6e9de8e06ef65e65f18dbd05523c7ca9

export class List<T> {
  constructor(public readonly generator: () => Generator,
              public readonly length: number = Infinity) {
    this[Symbol.iterator] = generator;
  }

  public static get integers(): List<number> {
    return this.range(0, Infinity)
  }

  public static get fibonacci(): List<number> {
    return new List(function* (): any {
      let x = 1
      let y = 1
      yield* [ 0, x, y ]

      while (true) {
        let next = x + y
        yield next
        x = y
        y = next
      }
    }, Infinity);
  }

  public static of<T>(...args: T[]): List<T> {
    return new List(function* (): any {
      yield* args
    }, args.length)
  }

  public static from<T>(iterable: Array<T>): List<T> {
    return new List(function* (): any {
      yield* iterable
    }, iterable.length)
  }

  public static range<T>(start: number, end: number, step: number = 1): List<T> {
    return new List(function* (): any {
      let i = start
      while (i <= end) {
        yield i
        i += step
      }
    }, Math.floor((end - start + 1) / step))
  }

  public static empty<T>(): List<T> {
    return new List(function* (): any {}, 0)
  }

  public concat(iterable: Array<T>): List<T> {
    const generator = this[Symbol.iterator]
    return new List(function* (): any {
      yield* generator()
      yield* iterable
    }, this.length + iterable.length)
  }

  public map<R>(mapper: (item: T) => R): List<R> {
    const generator = this[Symbol.iterator]
    return new List(function* (): any {
      for (const value of generator()) {
        yield mapper(value)
      }
    }, this.length)
  }

  public filter(predicate: (item: T) => boolean): List<T> {
    const generator = this[Symbol.iterator]
    return new List(function* (): any {
      for (const value of generator()) {
        if (predicate(value)) yield value
      }
    }, this.length)
  }

  public scan(scanner: Function, seed: T): List<T> {
    const generator = this[Symbol.iterator]
    return new List(function* (): any {
      let acc = seed
      for (const value of generator()) {
        yield acc = scanner(acc, value)
      }
    }, this.length)
  }

  public reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T,
                seed: T): T {
    return this.toArray().reduce(reducer, seed);
  }

  public ap(list: List<T>): List<T> {
    const generator = this[Symbol.iterator];
    return new List(function* (): any {
      for (const f of generator()) {
        // @ts-ignore
        yield* list.map(f);
      }
    }, this.length);
  }

  public take(x: number): List<T> {
    const generator = this[Symbol.iterator];
    return new List(function* (): any {
      const iterator = generator();
      let next = iterator.next();
      let n = 0;

      while (!next.done && x > n) {
        yield next.value;
        n++;
        next = iterator.next();
      }
    }, this.length > x ? x : this.length);
  }

  public drop(x: number): List<T> {
    const generator = this[Symbol.iterator];
    return new List(function* (): any {
      const iterator = generator();
      let next = iterator.next();
      let n = 1;

      while (!next.done) {
        if (n > x) yield next.value;
        n++;
        next = iterator.next();
      }
    }, this.length - x);
  }

  public zipWith<B, R>(lazyList: List<B>, zipper: (a: T, b: B) => R): List<R> {
    const generator1 = this[Symbol.iterator]
    const generator2 = lazyList[Symbol.iterator]
    return new List(function* (): any {
      const iterator1 = generator1();
      const iterator2 = generator2();
      let next1 = iterator1.next();
      let next2 = iterator2.next();

      while (!next1.done && !next2.done) {
        yield zipper(next1.value, next2.value)
        next1 = iterator1.next()
        next2 = iterator2.next()
      }
    }, this.length < lazyList.length ? this.length : lazyList.length);
  }

  public head(): List<T> {
    return this[Symbol.iterator]().next().value;
  }

  public tail(): List<T> {
    return this.drop(1);
  }

  public toArray(): Array<T> {
    // @ts-ignore
    return [ ...this ];
  }

  public toString(): string {
    const displayedCount = 100
    return `List [ ${
      this.take(displayedCount).toArray().join(', ')
    }${
      this.length > displayedCount ? ' ...' : ''
    } ]`;
  }

  public inspect(): string {
    return this.toString();
  }
}
