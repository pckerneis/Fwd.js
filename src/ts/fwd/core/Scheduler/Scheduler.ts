import { Time, Event, EventRef, EventQueue } from '../EventQueue/EventQueue';

export abstract class Scheduler<EventType extends Event> {

    onEnded: Function;
    keepAlive: boolean;
    
    readonly eventQueue: EventQueue<EventType>;

    abstract running: boolean;
    abstract interval: number;
    abstract lookAhead: number;

    abstract now(): Time;
    
    protected abstract run(): void;

    abstract start(position: Time): void;
    abstract stop(): void;

    abstract schedule(time: Time, event: EventType): EventRef;
    abstract cancel(eventRef: EventRef): void;
}
