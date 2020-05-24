export type Time = number;

/**
 * A unique identifier for scheduled events.
 */
export type EventRef = any;

/**
 * Holds together an event, the time location at which it is scheduled and the scheduler's reference for this scheduled
 * event.
 */
export interface ScheduledEvent<EventType> {
    ref: EventRef,
    time: Time,
    event: EventType
}

/**
 * Maintains an ordered list of scheduled events and exposes methods to add and retrieve them. It doesn't keep track of the
 * time but instead is meant to be used by repeatedly calling `next` to obtain all the events that should be fired at a
 * specified time location.
 */
export abstract class EventQueue<EventType> {

    /**
     * The current list of scheduled events.
     */
    public readonly events: ScheduledEvent<EventType>[];

    /**
     * Pop and return the next event in the queue if its time location is inferior to the specified time location. Return
     * null otherwise.
     *
     * @param now The current time location.
     * @returns a scheduled event whose time location is inferior to the specified time or `null` if no event match.
     */
    public abstract next(now: Time): ScheduledEvent<EventType> | null;

    /**
     * Insert an event in the queue. The queue is kept sorted in time position at insertion. If there are already events at
     * the specified time location, the event will be inserted after the last event with equal time location.
     *
     * @param time The time location at which the event is scheduled.
     * @param event the {@link Event} to add to the queue.
     *
     * @returns an EventRef that can used later on to remove the event from the queue. See {@link remove}.
     */
    public abstract add(time: Time, event: EventType): EventRef;

    /**
     * Insert an event in the queue. The queue is kept sorted in time position at insertion. If there are already events at
     * the specified time location, the event will be inserted after the last event with equal time location.
     *
     * @param eventRef A reference to the event to remove, obtained from a call to {@link add}.
     */
    public abstract remove(eventRef: EventRef): void;

    /**
     * Removes all previously added events.
     */
    public abstract clear(): void;
}
