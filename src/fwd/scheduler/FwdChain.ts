import { Time } from './EventQueue/EventQueue';
import { FwdScheduler } from './FwdScheduler';

export abstract class FwdChainEvent {
  private _next: FwdChainEvent;

  protected constructor(public readonly scheduler: FwdScheduler) {
  }

  public get next(): FwdChainEvent {
    return this._next;
  }

  public set next(event: FwdChainEvent) {
    this._next = event;
  }

  public abstract trigger(): void;
}

export class FwdWait extends FwdChainEvent {
  constructor(scheduler: FwdScheduler, public readonly time: (() => Time) | Time) {
    super(scheduler);
  }

  public trigger(): void {
    if (this.next && typeof this.next.trigger === 'function') {
      const timeValue = typeof this.time === 'function' ?
        this.time() :
        this.time;

      this.scheduler.schedule(this.scheduler.now() + timeValue, () => this.next.trigger(), true);
    }
  }
}

export type Callable = (...args: any[]) => any;

export class FwdFire extends FwdChainEvent {
  constructor(scheduler: FwdScheduler, public readonly action: Callable | string, public readonly args: any[]) {
    super(scheduler);
  }

  public trigger(): void {
    let timeValue = 0;

    if (typeof this.action === 'function') {
      timeValue = this.triggerActionFunction(this.action);
    } else if (typeof this.action === 'string') {
      timeValue = this.triggerNamedAction(this.action);
    } else {
      console.error('Cannot fire action. You should provide a function or a defined action name.', this.action);
    }

    if (isNaN(timeValue)) {
      timeValue = 0;
    }

    if (this.next && typeof this.next.trigger === 'function') {
      this.scheduler.schedule(this.scheduler.now() + timeValue, () => this.next.trigger(), true);
    }
  }

  private triggerNamedAction(actionName: string): any {
    const action = this.scheduler.get(actionName);

    if (action != null) {
      try {
        return action(...this.args);
      } catch (e) {
        console.error(e);
      }
    } else {
      console.error(`No action was found with the key '${this.action}'.`);
    }
  }

  private triggerActionFunction(action: Callable): any {
    try {
      return action(...this.args);
    } catch (e) {
      console.error(e);
    }
  }
}

export class FwdContinueIf extends FwdChainEvent {
  constructor(scheduler: FwdScheduler, public readonly condition: () => boolean) {
    super(scheduler);
  }

  public trigger(): void {
    if (typeof this.condition === 'function' && this.condition()) {
      this.scheduler.scheduleNow(() => this.next.trigger(), true);
    }
  }
}

export class FwdChain extends FwdChainEvent {
  private fwdChainEvents: FwdChainEvent[];

  constructor(public readonly scheduler: FwdScheduler, events?: FwdChainEvent[]) {
    super(scheduler);
    this.fwdChainEvents = events || [];
    this.linkEvents();
  }

  public get events(): FwdChainEvent[] { return this.fwdChainEvents; }

  public fire(action: Callable | string, ...args: any[]): this {
    this.append(new FwdFire(this.scheduler, action, args));
    return this;
  }

  public wait(time: (() => Time) | Time): this {
    this.append(new FwdWait(this.scheduler, time));
    return this;
  }

  public continueIf(condition: () => boolean): this {
    this.append(new FwdContinueIf(this.scheduler, condition));
    return this;
  }

  public continueIfStillRunning(): this {
    return this.continueIf(() => this.scheduler.state === 'running');
  }

  public concat(chain: FwdChain): this {
    const previous = this.last();
    const next = chain.first();

    if (previous != null) {
      previous.next = next;
    }

    this.fwdChainEvents = [...this.fwdChainEvents, ...chain.fwdChainEvents];

    return this;
  }

  public trigger(): void {
    if ((this.scheduler.state === 'running' || this.scheduler.state === 'ready')
      && this.fwdChainEvents.length > 0) {
      this.fwdChainEvents[0].trigger();
    }
  }

  public first(): FwdChainEvent {
    if (this.fwdChainEvents.length === 0) {
      return null;
    }

    return this.fwdChainEvents[0];
  }

  public last(): FwdChainEvent {
    if (this.fwdChainEvents.length === 0) {
      return null;
    }

    return this.fwdChainEvents[this.fwdChainEvents.length - 1];
  }

  public append(event: FwdChainEvent): void {
    const previous = this.last();

    if (previous != null) {
      previous.next = event;
    }

    this.fwdChainEvents = [...this.fwdChainEvents, event];
  }

  private linkEvents(): void {
    this.events.forEach((evt, index) => {
      if (index + 1 < this.events.length) {
        evt.next = this.events[index + 1];
      }
    });
  }
}
