import { Event, Time } from './EventQueue';
import { EventQueueImpl } from './EventQueueImpl';

export function testEventQueueSort(): void {
  class DummyEvent extends Event {
    public trigger(t: Time): void {
      console.log(t);
    }
  }

  const events = new EventQueueImpl<DummyEvent>();

  for (let i = 0; i < 1000; i++) {
    events.add((Math.random() * 100) | 0, new DummyEvent());
  }

  let prev: any = null;
  let errors = 0;

  events.events.forEach((element) => {
    if (prev != null) {
      if (prev.time > element) {
        console.log('Error !');
        errors ++;
      }
    }

    prev = element;
  });

  console.log(`Sort errors on ${events.events.length} elements: ${errors}`);
}
