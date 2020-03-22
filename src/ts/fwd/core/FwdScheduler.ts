import { Event, Time, EventRef } from './EventQueue/EventQueue';
import { SchedulerImpl } from './Scheduler/SchedulerImpl';
import { Scheduler } from './Scheduler/Scheduler';

let NOW: Time = 0;

class FwdEvent extends Event {
  private _stopped = false;

  constructor(
    public readonly time: Time,
    public readonly action: Function,
    public readonly cancelable: boolean
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

  stop(force?: boolean) {
    if (force || this.cancelable) {
      this._stopped = true;
    }
  }
}

export class FwdScheduler {
  private _scheduler: Scheduler<FwdEvent>;

  constructor(interval: number = 5, lookAhead: number = 50) {
    this._scheduler = new SchedulerImpl<FwdEvent>(interval, lookAhead);
  }

  schedule(time: Time, action: Function, preventCancel?: boolean) {
    const nextTime = NOW + time * 1000;
    return this._scheduler.schedule(nextTime, new FwdEvent(nextTime, action, ! preventCancel));
  }

  cancel(ref: EventRef) {
    this._scheduler.cancel(ref);
  }

  stop() {
    this._scheduler.eventQueue.events.forEach((scheduledEvent) => {
      scheduledEvent.event.stop();
    });
  }

  wait(time: Time) {
    NOW += time * 1000;
  }

  clearEvents() {
    this._scheduler.eventQueue.events.forEach((scheduledEvent) => {
      scheduledEvent.event.stop(true);
    });

    this._scheduler.eventQueue.clear();
  }

  start() {
    NOW = 0;
    this._scheduler.start(0);
  }

  now() {
    return NOW / 1000;
  }
}
