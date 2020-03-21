import { Scheduler } from './Scheduler';
import { EventQueue, Event, Time, ScheduledEvent } from '../EventQueue/EventQueue';
import { EventQueueImpl } from '../EventQueue/EventQueueImpl';

export class BasicEvent {
  constructor(private _action: Function) {
  }

  trigger(now: Time) {
    this._action(now);
  }
}

export class SchedulerImpl<EventType extends Event = BasicEvent> extends Scheduler<EventType> {
  private _now = 0;

  private _running = false;

  private _timeout: NodeJS.Timeout = null;

  private _startTime = 0;

  get running(): boolean {
    return this._running;
  }

  get interval(): number {
    return this._interval;
  }
  set interval(v: number) {
    this._interval = Math.max(0, v);
  }

  get lookAhead(): number {
    return this._lookAhead;
  }
  set lookAhead(v: number) {
    this._lookAhead = Math.max(0, v);
  }

  constructor(
      private _interval: number,
      private _lookAhead: number,
      private _eventQueue: EventQueue<EventType> = new EventQueueImpl<EventType>(),
      private _timeProvider: () => number = null,
  ) {
    super();

    // Constrain values by using public setters
    this.interval = _interval;
    this.lookAhead = _lookAhead;

    // Using default time provider if none is specified
    this._timeProvider = _timeProvider || systemNow;
  }

  start(): void {
    if (! this._running) {
      this._running = true;
      this._startTime = this._timeProvider();
    }

    this.run();
  }

  stop(): void {
    if (this._running) {
      this._running = false;
      clearTimeout(this._timeout);
    }
  }

  protected run(): void {
    if (! this._running) {
      return;
    }

    this._now = this._timeProvider() - this._startTime;

    let next = this._eventQueue.next(this._now);

    while (next != null) {
      next.event.trigger(next.time);
      next = this._eventQueue.next(this._now);
    }

    this._timeout = setTimeout(() => this.run(), this.interval);
  }

  schedule(time: Time, event: EventType): ScheduledEvent<EventType> {
    return {
      ref: this._eventQueue.add(time, event),
      event, 
      time
    };
  }

  cancel(eventRef: any): void {
    this._eventQueue.remove(eventRef);
  }
}

function systemNow(): number {
  return performance.now();
}
