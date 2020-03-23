import { Event, EventRef, Time } from './EventQueue/EventQueue';
import { Scheduler } from './Scheduler/Scheduler';
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
  public onEnded: Function;

  private _scheduler: Scheduler<FwdEvent>;

  private _state: State = 'ready';

  constructor(interval: number = 5, lookAhead: number = 50) {
    this._scheduler = new SchedulerImpl<FwdEvent>(interval, lookAhead);
    this._scheduler.onEnded = () => {
      this._state = 'stopped';

      if (this.onEnded != null) {
        this.onEnded();
      }
    }
  }

  public get state(): State { return this._state; }

  public now(): Time {
    return NOW / 1000;
  }

  public rtNow(): Time {
    return this._scheduler.now() / 1000;
  }

  public schedule(time: Time, action: Function, preventCancel?: boolean): EventRef {
    if (this._state === 'stopped' || this._state === 'stopping') {
      return null;
    }

    const nextTime = NOW + time * 1000;
    return this._scheduler.schedule(nextTime, new FwdEvent(nextTime, action, ! preventCancel));
  }

  public cancel(ref: EventRef): void {
    this._scheduler.cancel(ref);
  }

  public wait(time: Time): void {
    NOW += time * 1000;
  }

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

  public start(): void {
    if (this._state !== 'ready') {
      throw new Error('start should be called after initialization or after clearEvents.');
    }

    NOW = 0;
    this._scheduler.keepAlive = true;
    this._scheduler.start(0);
    this._state = 'running';
  }

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
