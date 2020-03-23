export type Time = number;

export abstract class Event {
    public abstract trigger(t: Time): void;
}

export type EventRef = any;

export interface ScheduledEvent<EventType extends Event> {
    ref: EventRef,
    time: Time,
    event: EventType
}

export abstract class EventQueue<EventType extends Event> {

    public readonly events: ScheduledEvent<EventType>[];
    public abstract next(now: Time): ScheduledEvent<EventType> | null;
    
    public abstract add(time: Time, event: EventType): EventRef;
    public abstract remove(eventRef: EventRef): void;
    public abstract clear(): void;
}
