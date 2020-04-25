import { Event, Time } from '../../../../src/fwd/core/EventQueue/EventQueue';
import { EventQueueImpl } from '../../../../src/fwd/core/EventQueue/EventQueueImpl';

class DummyEvent extends Event {
  public trigger(t: Time): void {
  }
}

it ('events added to the queue are kept sorted', () => {
  const events = new EventQueueImpl<DummyEvent>();

  for (let i = 0; i < 1000; i++) {
    events.add((Math.random() * 100) | 0, new DummyEvent());
  }

  let prev: any = null;

  events.events.forEach((element) => {
    if (prev != null) {
      expect(element.time).toBeGreaterThanOrEqual(prev.time);
    }
    prev = element;
  });
});

it ('events are cleared', () => {
  const events = new EventQueueImpl<DummyEvent>();

  for (let i = 0; i < 1000; i++) {
    events.add((Math.random() * 100) | 0, new DummyEvent());
  }
  events.clear();

  expect(events.events).toHaveLength(0);
});

it ('events inserted at the same time should be in correct order', () => {
  const events = new EventQueueImpl<DummyEvent>();

  const evt1 = new DummyEvent();
  const evt2 = new DummyEvent();
  const evt3 = new DummyEvent();

  const ref1 = events.add(123, evt1);
  const ref2 = events.add(123, evt2);
  const ref3 = events.add(123, evt3);

  expect(events.events[0].ref).toBe(ref1);
  expect(events.events[1].ref).toBe(ref2);
  expect(events.events[2].ref).toBe(ref3);
});

it ('events can be removed', () => {
  const events = new EventQueueImpl<DummyEvent>();

  const evt1 = new DummyEvent();
  const evt2 = new DummyEvent();
  const evt3 = new DummyEvent();

  const ref1 = events.add(1, evt1);
  const ref2 = events.add(2, evt2);
  const ref3 = events.add(3, evt3);

  events.remove(ref2);

  expect(events.events).toHaveLength(2);
  expect(events.events[0].event).toBe(evt1);
  expect(events.events[1].event).toBe(evt3);
});

it ('should return next element at time', () => {
  const events = new EventQueueImpl<DummyEvent>();

  const evt1 = new DummyEvent();
  const evt2 = new DummyEvent();
  const evt3 = new DummyEvent();

  events.add(1, evt1);
  events.add(2, evt2);
  events.add(3, evt3);

  let next = events.next(0);
  expect(next).toBeNull();

  next = events.next(1.1);
  expect(next.event).toBe(evt1);

  next = events.next(1.1);
  expect(next).toBeNull();

  next = events.next(4);
  expect(next.event).toBe(evt2);

  next = events.next(4);
  expect(next.event).toBe(evt3);

  next = events.next(4);
  expect(next).toBeNull();
});