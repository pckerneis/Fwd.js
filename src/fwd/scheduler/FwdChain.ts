import { Time } from './EventQueue/EventQueue';
import { FwdScheduler } from './FwdScheduler';

export abstract class FwdChainEvent {
  protected constructor(public readonly parentChain: FwdChain) {
  }

  public abstract trigger(position: number): void;
}

export class FwdWait extends FwdChainEvent {
  constructor(parentChain: FwdChain, public readonly time: (() => Time) | Time) {
    super(parentChain);
  }

  public trigger(position: number): void {
    const timeValue = typeof this.time === 'function' ?
      this.time() :
      this.time;

    this.parentChain.scheduler.scheduleAhead(timeValue,
      () => this.parentChain.triggerAt(position + 1), true);
  }
}

export type Callable = (...args: readonly any[]) => any;

export class FwdFire extends FwdChainEvent {
  constructor(parentChain: FwdChain, public readonly action: Callable | string, public readonly args: any[]) {
    super(parentChain);
  }

  public trigger(position: number): void {
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

    this.parentChain.scheduler.scheduleAhead(timeValue,
      () => this.parentChain.triggerAt(position + 1), true);
  }

  private triggerNamedAction(actionName: string): any {
    const action = this.parentChain.scheduler.get(actionName);

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
  constructor(parentChain: FwdChain, public readonly condition: () => boolean) {
    super(parentChain);
  }

  public trigger(position: number): void {
    if (typeof this.condition === 'function' && this.condition()) {
      this.parentChain.scheduler.scheduleNow(() =>
        this.parentChain.triggerAt(position + 1), true);
    }
  }
}

export class FwdChain extends FwdChainEvent {
  private fwdChainEvents: readonly FwdChainEvent[];

  constructor(public readonly scheduler: FwdScheduler,
              public readonly parentChain: FwdChain,
              events?: readonly FwdChainEvent[]) {
    super(parentChain);
    this.fwdChainEvents = events || [];
  }

  public get events(): readonly FwdChainEvent[] { return this.fwdChainEvents; }

  public fire(action: Callable | string, ...args: any[]): this {
    this.append(new FwdFire(this, action, args));
    return this;
  }

  public wait(time: (() => Time) | Time): this {
    this.append(new FwdWait(this, time));
    return this;
  }

  public continueIf(condition: () => boolean): this {
    this.append(new FwdContinueIf(this, condition));
    return this;
  }

  public continueIfStillRunning(): this {
    return this.continueIf(() => this.scheduler.state === 'running');
  }

  public concat(chain: FwdChain): this {
    this.fwdChainEvents = [...this.fwdChainEvents, ...chain.fwdChainEvents];
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
      this.fwdChainEvents[position].trigger(position);
    }
  }

  public append(event: FwdChainEvent): void {
    this.fwdChainEvents = [...this.fwdChainEvents, event];
  }
}

function isStrictlyPositive(count: number): boolean {
  return ! isNaN(count) && isFinite(count) && count > 0;
}
