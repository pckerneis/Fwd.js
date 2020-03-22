import { Event, Time, EventRef } from './EventQueue/EventQueue';
import { SchedulerImpl } from './Scheduler/SchedulerImpl';
import { Scheduler } from './Scheduler/Scheduler';

let NOW: Time = 0;

class FwdEvent extends Event {
  private _stopped = false;

  constructor(
    public readonly time: Time,
    public readonly action: Function,
    public readonly cancelable: boolean,
  ) {
    super();
  }

  trigger(now: Time) {
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
  private _scheduler: Scheduler<FwdEvent>;

  private _state: State = 'ready';

  onEnded: Function;

  get state(): State { return this._state; }

  constructor(interval: number = 5, lookAhead: number = 50) {
    this._scheduler = new SchedulerImpl<FwdEvent>(interval, lookAhead);
    this._scheduler.onEnded = () => {
      this._state = 'stopped';

      if (this.onEnded != null) {
        this.onEnded();
      }
    }
  }

  now() {
    return NOW / 1000;
  }

  rtNow() {
    return this._scheduler.now() / 1000;
  }

  schedule(time: Time, action: Function, preventCancel?: boolean): EventRef {
    if (this._state === 'stopped' || this._state === 'stopping') {
      return null;
    }

    const nextTime = NOW + time * 1000;
    return this._scheduler.schedule(nextTime, new FwdEvent(nextTime, action, ! preventCancel));
  }

  cancel(ref: EventRef) {
    this._scheduler.cancel(ref);
  }

  wait(time: Time) {
    NOW += time * 1000;
  }

  clearEvents() {
    if (this._state === 'running') {
      throw new Error('You should call stop before calling clearEvents.');
    }

    this._scheduler.eventQueue.events.forEach((scheduledEvent) => {
      this._scheduler.cancel(scheduledEvent.ref);
    });

    this._scheduler.eventQueue.clear();
    this._state = 'ready';
  }

  start() {
    if (this._state !== 'ready') {
      throw new Error('start should be called after initialization or after clearEvents.');
    }

    NOW = 0;
    this._scheduler.start(0);
    this._state = 'running';
  }

  stop() {
    if (this._state !== 'running') {
      throw new Error('stop should be called after start.');
    }

    this._scheduler.eventQueue.events.forEach((scheduledEvent) => {
      if (scheduledEvent.event.cancelable) {
        this._scheduler.cancel(scheduledEvent.ref);
      }
    });
    
    this._state = 'stopping';
  }
}
