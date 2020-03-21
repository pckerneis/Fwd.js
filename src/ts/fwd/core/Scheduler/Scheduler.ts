import { Time, Event, EventRef } from '../EventQueue/EventQueue';

export abstract class Scheduler<EventType extends Event> {
    abstract running: boolean;
    abstract interval: number;
    abstract lookAhead: number;
    
    protected abstract run(): void;

    abstract start(): void;
    abstract stop(): void;

    abstract schedule(time: Time, event: EventType): EventRef;
    abstract cancel(eventRef: EventRef): void;
}
