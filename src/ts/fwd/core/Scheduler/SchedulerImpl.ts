import { Event, EventQueue, EventRef, ScheduledEvent, Time } from '../EventQueue/EventQueue';
import { EventQueueImpl } from '../EventQueue/EventQueueImpl';
import { Scheduler } from './Scheduler';

export class BasicEvent {
  constructor(private _action: Function) {
  }

  public trigger(now: Time): void {
    this._action(now);
  }
}

export class SchedulerImpl<EventType extends Event = BasicEvent> extends Scheduler<EventType> {

  /** @inheritdoc */
  public onEnded: Function;

  /** @inheritdoc */
  public keepAlive: boolean;

  private _now: Time = 0;

  private _running: boolean = false;

  private _timeout: NodeJS.Timeout = null;

  private _startTime: Time = 0;

  constructor(
      private _interval: number,
      private _lookAhead: number,
      private _eventQueue: EventQueue<EventType> = new EventQueueImpl<EventType>(),
      private readonly _timeProvider: () => number = null,
  ) {
    super();

    // Constrain values by using public setters
    this.interval = _interval;
    this.lookAhead = _lookAhead;

    // Using default time provider if none is specified
    this._timeProvider = _timeProvider || systemNow;
  }

  /** @inheritdoc */
  public get running(): boolean {
    return this._running;
  }

  /** @inheritdoc */
  public get interval(): number {
    return this._interval;
  }

  /** @inheritdoc */
  public set interval(v: number) {
    this._interval = Math.max(0, v);
  }

  /** @inheritdoc */
  public get lookAhead(): number {
    return this._lookAhead;
  }

  /** @inheritdoc */
  public set lookAhead(v: number) {
    this._lookAhead = Math.max(0, v);
  }

  /** @inheritdoc */
  public get eventQueue(): EventQueue<EventType> {
    return this._eventQueue;
  }

  /** @inheritdoc */
  public now(): Time {
    return this._now;
  }

  /** @inheritdoc */
  public start(position: Time): void {
    if (this._running) {
      this.stop();
    }

    this._running = true;
    this._startTime = this._timeProvider();
    this._now = position;
    this.run();
  }

  /** @inheritdoc */
  public stop(): void {
    if (this._running) {
      clearTimeout(this._timeout);
      this._running = false;
    }
  }

  /** @inheritdoc */
  public clearQueue(): void {
    this._eventQueue.clear();
  }

  /** @inheritdoc */
  public schedule(time: Time, event: EventType): EventRef {
    this._eventQueue.add(time, event);
  }

  /** @inheritDoc */
  public cancel(eventRef: EventRef): void {
    this._eventQueue.remove(eventRef);
  }

  /** @inheritDoc */
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

    if (this._eventQueue.events.length > 0 || this.keepAlive) {
      this._timeout = setTimeout(() => this.run(), this.interval);
    } else if (this.onEnded != null) {
      this.onEnded();
    }
  }
}

function systemNow(): number {
  return performance.now();
}
