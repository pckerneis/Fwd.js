import { Time } from './EventQueue/EventQueue';
import { FwdScheduler } from './FwdScheduler';

export abstract class FwdChainEvent {
  protected constructor() {
  }

  public abstract trigger(scheduler: FwdScheduler, next: Function): void;
}

export class FwdWait extends FwdChainEvent {
  constructor(public readonly time: (() => Time) | Time) {
    super();
  }

  public trigger(scheduler: FwdScheduler, next: Function): void {
    const timeValue = typeof this.time === 'function' ?
      this.time() :
      this.time;

    scheduler.scheduleAhead(timeValue, next, true);
  }
}

export type Callable = (...args: readonly any[]) => any;

export class FwdFire extends FwdChainEvent {
  constructor(public readonly action: Callable | string, public readonly args: any[]) {
    super();
  }

  public trigger(scheduler: FwdScheduler, next: Function): void {
    let timeValue = 0;

    if (typeof this.action === 'function') {
      timeValue = this.triggerActionFunction(this.action);
    } else if (typeof this.action === 'string') {
      timeValue = this.triggerNamedAction(scheduler, this.action);
    } else {
      console.error('Cannot fire action. You should provide a function or a defined action name.', this.action);
    }

    if (! isStrictlyPositive(timeValue)) {
      timeValue = 0;
    }

    scheduler.scheduleAhead(timeValue, next, true);
  }

  private triggerNamedAction(scheduler: FwdScheduler, actionName: string): any {
    const action = scheduler.get(actionName);

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
  constructor(public readonly condition: () => boolean) {
    super();
  }

  public trigger(scheduler: FwdScheduler, next: Function): void {
    if (typeof this.condition === 'function' && this.condition()) {
      scheduler.scheduleNow(next, true);
    }
  }
}

export class FwdChain extends FwdChainEvent {
  private fwdChainEvents: readonly FwdChainEvent[];

  constructor(public readonly scheduler: FwdScheduler,
              events?: readonly FwdChainEvent[]) {
    super();
    this.fwdChainEvents = events || [];
  }

  public get events(): readonly FwdChainEvent[] { return this.fwdChainEvents; }

  public fire(action: Callable | string, ...args: any[]): this {
    this.append(new FwdFire( action, args));
    return this;
  }

  public wait(time: (() => Time) | Time): this {
    this.append(new FwdWait(time));
    return this;
  }

  public continueIf(condition: () => boolean): this {
    this.append(new FwdContinueIf(condition));
    return this;
  }

  public continueIfStillRunning(): this {
    return this.continueIf(() => this.scheduler.state === 'running');
  }

  public concat(chain: FwdChain): this {
    this.fwdChainEvents = [
      ...this.fwdChainEvents,
      ...chain.fwdChainEvents,
    ];

    return this;
  }

  public repeat(count: number, chain: FwdChain): this {
    if (!isStrictlyPositive(count)) {
      return this;
    }

    do {
      this.concat(chain);
      console.log(this.events);
      count--;
    } while (count > 0);

    return this;
  }

  public trigger(): void {
    if ((this.scheduler.state === 'running' || this.scheduler.state === 'ready')
      && this.fwdChainEvents.length > 0) {
      this.triggerAt(0);
    }
  }

  public triggerAt(position: number): void {
    if (position < this.fwdChainEvents.length) {
      this.fwdChainEvents[position].trigger(this.scheduler,
        () => this.triggerAt(position + 1));
    }
  }

  public append(event: FwdChainEvent): void {
    this.fwdChainEvents = [...this.fwdChainEvents, event];
  }
}

function isStrictlyPositive(count: number): boolean {
  return ! isNaN(count) && isFinite(count) && count > 0;
}
