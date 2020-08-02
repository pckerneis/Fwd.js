import { Logger } from "../../utils/Logger";
import parentLogger from "../logger.core";
import { EventQueue, EventRef, ScheduledEvent, Time } from './EventQueue';

const DBG = new Logger('EventQueueImpl', parentLogger);

export class EventQueueImpl<EventType> extends EventQueue<EventType> {
  private latestRefIdx: number = 0;

  private _events: ScheduledEvent<EventType>[] = [];

  /** @inheritdoc */
  public get events(): ScheduledEvent<EventType>[] {
      return this._events;
    }

  /** @inheritdoc */
  public next(now: Time): ScheduledEvent<EventType> | null {
      if (this._events.length === 0) {
        return null;
      }

      if (this._events[0].time <= now) {
        return this._events.splice(0, 1)[0];
      }

      return null;
    }

  /** @inheritdoc */
  public add(time: Time, event: EventType): EventRef {
      if (isNaN(time)) {
        time = 0;
      }

      const idx = this.insertIndex(time, 0, this._events.length);
      const scheduledEvent: ScheduledEvent<EventType> = {
        event,
        time,
        ref: this.newRef(),
      };

      this._events.splice(idx, 0, scheduledEvent);

      return scheduledEvent.ref;
    }

  /** @inheritdoc */
  public remove(eventRef: EventRef): void {
      this._events = this.events.filter((e) => e.ref !== eventRef);
    }

  /** @inheritdoc */
  public clear(): void {
      DBG.info('Clear events');
      this._events = [];
    }

  // Recursive divide and conquer to find insert index in already sorted array
  private insertIndex(time: Time, min: number, max: number): number {
    const range = max - min;

    /*
    if (isNaN(range) || max < min) {
      return undefined;
    }
     */

    if (range === 0) {
      return min;
    }

    let pivot = (Math.random() * range + min) | 0;
    let timeAtPivot = this._events[pivot].time;

    while (timeAtPivot === time) {
      pivot++;

      if (pivot >= this._events.length) {
        return pivot;
      }

      timeAtPivot = this._events[pivot].time;

      if (timeAtPivot > time) {
        return pivot;
      }
    }

    if (timeAtPivot > time) {
      return this.insertIndex(time, min, pivot);
    } else {
      return this.insertIndex(time, pivot + 1, max);
    }
  }

  private newRef(): EventRef {
      return '' + this.latestRefIdx++;
    }
}
