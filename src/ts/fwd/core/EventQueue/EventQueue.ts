export type Time = number;

export abstract class Event {
    abstract trigger(t: Time): void;
}

export type EventRef = any;

export interface ScheduledEvent<EventType extends Event> {
    ref: EventRef,
    time: Time,
    event: EventType
}

export abstract class EventQueue<EventType extends Event> {
    abstract next(now: Time): ScheduledEvent<EventType> | null;
    
    abstract add(time: Time, event: EventType): EventRef;
    abstract remove(eventRef: EventRef): void;
    abstract clear(): void;

    public readonly events: ScheduledEvent<EventType>[];
}
