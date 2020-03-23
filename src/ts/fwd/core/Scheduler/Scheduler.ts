import { Event, EventQueue, EventRef, Time } from '../EventQueue/EventQueue';

export abstract class Scheduler<EventType extends Event> {

    public onEnded: Function;
    public  keepAlive: boolean;

    public readonly eventQueue: EventQueue<EventType>;

    public abstract running: boolean;
    public abstract interval: number;
    public abstract lookAhead: number;

    public abstract now(): Time;

    public abstract start(position: Time): void;
    public abstract stop(): void;

    public abstract schedule(time: Time, event: EventType): EventRef;
    public abstract cancel(eventRef: EventRef): void;

    protected abstract run(): void;
}
