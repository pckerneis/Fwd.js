import { Logger } from '../utils/Logger';
import { EventRef, Time } from './EventQueue/EventQueue';
import parentLogger from './logger.core';
import { Action, Scheduler } from './Scheduler/Scheduler';
import { SchedulerImpl } from './Scheduler/SchedulerImpl';

const DBG = new Logger('FwdScheduler', parentLogger);

let NOW: Time = 0;

class FwdEvent implements Action {
  constructor(
    public readonly time: Time,
    public readonly action: Function,
    public readonly cancelable: boolean,
  ) {}

  public trigger(): void {
    const previous = NOW;
    NOW = this.time;
    this.action();
    NOW = previous;
  }
}

abstract class FwdChainEvent {
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

class FwdWait extends FwdChainEvent {
  constructor(scheduler: FwdScheduler, public readonly time: (() => Time) | Time) {
    super(scheduler);
  }

  public trigger(): void {
    if (this.next && typeof this.next.trigger === 'function') {
      const timeValue = typeof this.time === 'function' ?
        this.time() :
        this.time;

      this.scheduler.schedule(timeValue, () => this.next.trigger(), true);
    }
  }
}

class FwdFire extends FwdChainEvent {
  constructor(scheduler: FwdScheduler, public readonly action: Function | string, public readonly args: any[]) {
    super(scheduler);
  }

  public trigger(): void {
    if (typeof this.action === 'function') {
      try {
        this.action(...this.args);
      } catch(e) {
        console.error(e);
      }
    } else if (typeof this.action === 'string') {
      const action = this.scheduler.getAction(this.action);

      if (action != null) {
        try {
          action(...this.args);
        } catch(e) {
          console.error(e);
        }
      }
    } else {
      console.error('Cannot fire action. You should provide a function or a defined action name.', this.action);
    }

    if (this.next && typeof this.next.trigger === 'function') {
      this.scheduler.schedule(0, () => this.next.trigger(), true);
    }
  }
}

class FwdChain {
  private _chain: FwdChainEvent[] = [];

  constructor(public readonly scheduler: FwdScheduler) {
  }

  public get chain(): FwdChainEvent[] { return this._chain; }

  public fire(action: Function | string, ...args: any[]): this {
    this.append(new FwdFire(this.scheduler, action, args));
    return this;
  }

  public wait(time: number): this {
    this.append(new FwdWait(this.scheduler, time));
    return this;
  }

  public concat(chain: FwdChain): this {
    const previous = this.last();
    const next = chain.first();

    if (previous != null) {
      previous.next = next;
    }

    this._chain = [...this._chain, ...chain._chain];

    return this;
  }

  public trigger(): void {
    if ((this.scheduler.state === 'running' || this.scheduler.state === 'ready')
      && this._chain.length > 0) {
      this._chain[0].trigger();
    }
  }

  public first(): FwdChainEvent {
    if (this._chain.length === 0) {
      return null;
    }

    return this._chain[0];
  }

  public last(): FwdChainEvent {
    if (this._chain.length === 0) {
      return null;
    }

    return this._chain[this._chain.length - 1];
  }

  public append(event: FwdChainEvent): void {
    const previous = this.last();

    if (previous != null) {
      previous.next = event;
    }

    this._chain = [...this._chain, event];
  }
}

type State = 'stopping' | 'stopped' | 'running' | 'ready';

export class FwdScheduler {

  /**
   * A method that will be called when the scheduler stops (that is when all non-cancelable events were fired).
   */
  public onEnded: Function;

  private _scheduler: Scheduler<FwdEvent>;

  private _state: State = 'ready';

  private _definitions: any = {};

  /**
   * Builds an instance of the scheduler with the provided parameters.
   *
   * @param interval The delay between the end of a run and the next one, in milliseconds.
   * @param lookAhead The time range in which events will be considered as ready to be fired, in milliseconds.
   */
  constructor(interval: number = SchedulerImpl.MIN_INTERVAL, lookAhead: number = SchedulerImpl.DEFAULT_LOOKAHEAD) {
    this._scheduler = new SchedulerImpl<FwdEvent>(interval, lookAhead);
    this._scheduler.onEnded = () => {
      this._state = 'stopped';

      DBG.debug('on ended called');

      if (this.onEnded != null) {
        this.onEnded();
      }
    }
  }

  /**
   * Set the time provider for the scheduler.
   *
   * @param timeProvider a function that returns a time position in milliseconds
   */
  public set timeProvider(timeProvider: () => number) {
    this._scheduler.timeProvider = timeProvider;
  }

  /**
   * The current state for the scheduler, either `running`, `stopping`, `stopped` or `ready`.
   */
  public get state(): State { return this._state; }

  /**
   * Returns the current time position for the scheduler. It's only useful when called inside the `FwdScheduler`'s
   * execution stack as otherwise it will always return `0`. See {@link rtNow}.
   *
   * @returns The current position of the scheduler's head in seconds.
   */
  public now(): Time {
    return NOW;
  }

  /**
   * Returns the current real-time position for the scheduler. Unlike {@link now}, rtNow gives a value that's not relying
   * upon the execution stack so whenever you'll want to now the execution time from the outside of the scheduler, that's
   * the method you'd use.
   *
   * @returns The time elapsed since the FwdScheduler's start in seconds.
   */
  public rtNow(): Time {
    return this._scheduler.now();
  }

  /**
   * Schedule an action. The time passed in is relative to the current time position of the scheduler.
   *
   * @param time The delay before the action gets executed.
   * @param action A function to be called at the specified time.
   * @param preventCancel If `true`, the action will be triggered even if `fwd.stop` was called. Use it
   *   with caution in situations where an action must be followed by another no matter what.
   *
   * @returns an `EventRef` that allows to cancel the event. See {@link cancel}.
   */
  public schedule(time: Time, action: Function, preventCancel?: boolean): EventRef {
    if (this._state === 'stopped'
      || (this._state === 'stopping' && ! preventCancel)) {
      return null;
    }

    const nextTime = NOW + time;
    return this._scheduler.schedule(nextTime, new FwdEvent(nextTime, action, ! preventCancel));
  }

  /**
   * Cancel an action previously scheduled. If the action already was executed, this won't do anything.
   * See {@link schedule}.
   *
   * @param eventRef A reference to the scheduled action obtained from a call to {@link schedule}.
   */
  public cancel(eventRef: EventRef): void {
    this._scheduler.cancel(eventRef);
  }

  public wait(time: Time): FwdChain {
    const chain = new FwdChain(this);
    chain.wait(time);
    return chain;
  }

  public fire(action: Function | string, ...args: any[]): FwdChain {
    const chain = new FwdChain(this);
    chain.fire(action, ...args);
    return chain;
  }

  /**
   * Removes all scheduled events, regardless of whether they can be canceled or not, and set the state to `ready`.
   * Use it with care when you know you can cancel all events without any harm, before starting a new execution. The
   * scheduler state will be set to `ready` which will then allow to call {@link start} again.
   *
   * Calling this method while the scheduler's state is `running` will throw an error.
   */
  public clearEvents(): void {
    if (this._state === 'running') {
      throw new Error('You should call stop before calling clearEvents.');
    }

    this._scheduler.eventQueue.events.forEach((scheduledEvent) => {
      this._scheduler.cancel(scheduledEvent.ref);
    });

    this._scheduler.eventQueue.clear();
    this._state = 'ready';
  }

  /**
   * Reset the time pointer, start a new execution and set the state to `running`.
   *
   * Calling this method will throw an error if the current state is not `ready`.
   */
  public start(): void {
    if (this._state !== 'ready') {
      throw new Error('start should be called after initialization or after clearEvents.');
    }

    NOW = 0;
    this._scheduler.keepAlive = true;
    this._scheduler.start(0);
    this._state = 'running';
  }

  /**
   * Stop the execution. This will _softly_ kill the execution by canceling all cancelable events and letting the internal
   * scheduler run until all events were processes.
   *
   * Calling this method will set the scheduler state to `stopping` until all non-cancelable events were processed, which
   * will flip the state to `stopped`.
   */
  public stop(): void {
    if (this._state === 'stopping') {
      // Stop has already been called but there are still events to process...
      return;
    }

    if (this._state !== 'running') {
      throw new Error('stop should be called after start.');
    }

    this._scheduler.eventQueue.events.forEach((scheduledEvent) => {
      if (scheduledEvent.event.cancelable) {
        this._scheduler.cancel(scheduledEvent.ref);
      }
    });

    this._state = 'stopping';
    this._scheduler.keepAlive = false;
  }

  public getAction(name: string): any {
    return this._definitions[name];
  }

  public defineAction(name: string, action: () => any): any {
    this._definitions[name] = action;
    return action;
  }

  public resetActions(): void {
    this._definitions = {};
  }
}
