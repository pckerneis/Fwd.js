import { Event, EventRef, Time } from './EventQueue/EventQueue';
import { Scheduler } from "./Scheduler/Scheduler";
import { SchedulerImpl } from './Scheduler/SchedulerImpl';

let NOW: Time = 0;

class FwdEvent extends Event {
  private _stopped: boolean = false;

  constructor(
    public readonly time: Time,
    public readonly action: Function,
    public readonly cancelable: boolean,
  ) {
    super();
  }

  public trigger(now: Time): void {
    if (! this._stopped) {
      const previous = NOW;
      NOW = now;
      this.action();
      NOW = previous;
    }
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

  /**
   * Builds an instance of the scheduler with the provided parameters.
   *
   * @param interval The delay between the end of a run and the next one, in milliseconds.
   * @param lookAhead The time range in which events will be considered as ready to be fired, in milliseconds.
   */
  constructor(interval: number = SchedulerImpl.MIN_INTERVAL, lookAhead: number = SchedulerImpl.DEFAULT_LOOKAHEAD) {
    this._scheduler = new SchedulerImpl<FwdEvent>(interval, lookAhead);
    this._scheduler.keepAlive = true;
    this._scheduler.onEnded = () => {
      this._state = 'stopped';

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
    if (this._state === 'stopped' || this._state === 'stopping') {
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

  /**
   * Move the current time position of the scheduler.
   *
   * @param time A positive duration in seconds.
   */
  public wait(time: Time): void {
    NOW += time;
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
}
