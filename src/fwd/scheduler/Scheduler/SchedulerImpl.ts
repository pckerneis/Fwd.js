import { Logger, LoggerLevel } from "../../utils/Logger";
import { EventQueue, EventRef, Time } from '../EventQueue/EventQueue';
import { EventQueueImpl } from '../EventQueue/EventQueueImpl';
import parentLogger from '../logger.core';
import { Action, Scheduler } from './Scheduler';

const DBG = new Logger('SchedulerImpl', parentLogger, LoggerLevel.warn);

export class SchedulerImpl<EventType extends Action> implements Scheduler<EventType> {

  public static readonly MIN_INTERVAL: number = 0;
  public static readonly DEFAULT_LOOKAHEAD: number = 0.050;

  /** @inheritdoc */
  public onEnded: Function;

  /** @inheritdoc */
  public keepAlive: boolean;

  private _now: Time = 0;

  private _running: boolean = false;

  private _timeout: number | null = null;

  private _startTime: Time = 0;

  private _clockFunction: () => number;

  constructor(
      private _interval: number,
      private _lookAhead: number,
      private _eventQueue: EventQueue<EventType> = new EventQueueImpl<EventType>(),
      clockFunction?: () => number,
  ) {
    DBG.info('Build SchedulerImpl', this);

    // Constrain values by using public setters
    this.interval = _interval;
    this.lookAhead = _lookAhead;

    // Using default time provider if none is specified
    this._clockFunction = clockFunction || systemNowInSeconds;
    DBG.debug('Using time provider:', this._clockFunction);
  }

  /** @inheritdoc */
  public set clockFunction(clockFunction: () => number) {
    this._clockFunction = clockFunction;
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
    this._interval = Math.max(SchedulerImpl.MIN_INTERVAL, v);
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
    this.prepareToRun(position);
    this.run();
  }

  /** @inheritdoc */
  public stop(): void {
    if (this._running) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      this._running = false;
    }
  }

  /** @inheritdoc */
  public runSync(start: Time, end: Time): void {
    this.prepareToRun(start);

    let next = this._eventQueue.next(end);

    while (next != null) {
      next.event.trigger();
      next = this._eventQueue.next(end);
    }

    this._running = false;
  }

  /** @inheritdoc */
  public clearQueue(): void {
    this._eventQueue.clear();
  }

  /** @inheritdoc */
  public schedule(time: Time, event: EventType): EventRef {
    return this._eventQueue.add(time, event);
  }

  /** @inheritDoc */
  public cancel(eventRef: EventRef): void {
    this._eventQueue.remove(eventRef);
  }

  private prepareToRun(startPosition: Time): void {
    if (this._running) {
      DBG.info('Scheduler started while already running. About to stop.');
      this.stop();
    }

    DBG.info('Scheduler started at position ' + startPosition + '. About to run.');

    this._running = true;
    this._startTime = this._clockFunction();
    this._now = startPosition;
  }

  /**
   * Process the next scheduled events until the next event's time position is superior to the current time position plus
   * the specified {@link lookAhead}.
   */
  private run(): void {
    if (! this._running) {
      return;
    }

    this._now = this._clockFunction() - this._startTime;
    const t1 = this._now;
    const when = this._now + this.lookAhead;

    DBG.info('Processing events at ' + this._now + ' with lookAhead ' + this.lookAhead);

    let next = this._eventQueue.next(when);

    while (next != null) {
      next.event.trigger();
      next = this._eventQueue.next(when);
    }

    const elapsed = (this._clockFunction() - this._startTime) - t1;

    if (this._eventQueue.events.length > 0 || this.keepAlive) {
      const waitTime = Math.max(0, this.interval - elapsed);
      this._timeout = window.setTimeout(() => this.run(), waitTime);
      DBG.info('Timeout set with computed interval ' + waitTime);
    } else {
      this._running = false;
      DBG.info('Scheduler stops running at ', this.now());

      if (this.onEnded != null) {
        this.onEnded();
        DBG.info('onEnded callback was called');
      }
    }
  }
}

export function systemNowInSeconds(): number {
  return performance.now() / 1000;
}
