import { Time, Event, EventRef, EventQueue, ScheduledEvent } from './EventQueue';

export class EventQueueImpl<EventType extends Event> extends EventQueue<Event> {
    private latestRefIdx = 0;

    private _events: ScheduledEvent<EventType>[] = [];

    get events() {
      return this._events;
    }

    next(now: Time): ScheduledEvent<EventType> | null {
      if (this._events.length === 0) {
        return null;
      }

      if (this._events[0].time < now) {
        return this._events.splice(0, 1)[0];
      }

      return null;
    }

    add(time: Time, event: EventType): EventRef {
      const idx = this.insertIndex(time, 0, this._events.length);
      const scheduledEvent: ScheduledEvent<EventType> = {
        event,
        time,
        ref: this.newRef(),
      };

      this._events.splice(idx, 0, scheduledEvent);

      return scheduledEvent.ref;
    }

    remove(eventRef: EventRef): void {
      this._events = this.events.filter((e) => e.ref !== eventRef);
    }

    clear(): void {
      this._events = [];
    }

    // Recursive divide and conquer to find insert index in already sorted array
    private insertIndex(time: Time, min: number, max: number): number {
      const range = max - min;

      if (isNaN(range) || max < min) {
        return undefined;
      }

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
