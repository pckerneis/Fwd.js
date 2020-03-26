import { Event, EventQueue, EventRef, Time } from '../EventQueue/EventQueue';

/**
 * Real-time scheduler. It maintains a list of events that can be added with {@link schedule}. Once the scheduler is
 * started, `run` gets repeatedly called, iterating over the next elements to find the events that should be fired.
 *
 * The Scheduler class is parametrized with an event type which extends {@link Event}. At the minimum, an Event should
 * have a `trigger` method which is called by the scheduler when the event should be fired.
 */
export abstract class Scheduler<EventType extends Event> {

    /**
     * A method that will be called if {@link keepAlive} is set to `true` and there's no events to process at the end of a
     * run.
     */
    public onEnded: Function;

    /**
     * When set to `true`, the scheduler won't stop running if there are no more events scheduled. This comes handy when you
     * don't know in advance what events you'll process.
     */
    public  keepAlive: boolean;

    /**
     * The {@link EventQueue} this scheduler is using.
     */
    public readonly eventQueue: EventQueue<EventType>;

    /**
     * Is this scheduler currently running ?
     */
    public abstract readonly running: boolean;

    /**
     * The delay between the end of a run and the next one, in milliseconds.
     */
    public abstract readonly interval: number;

    /**
     * The time range in which events will be considered as ready to be fired, in milliseconds.
     */
    public abstract readonly lookAhead: number;

    /**
     * Returns the current time position for the scheduler in milliseconds. It's only useful when called inside the
     * scheduler's execution stack as otherwise it will always return `0`.
     *
     * @returns The current position of the scheduler's head in milliseconds.
     */
    public abstract now(): Time;

    /**
     * Start processing the event queue from a specified time position. If the scheduler is already started then this method
     * won't do anything.
     *
     * @param position A time position to start at, in milliseconds.
     */
    public abstract start(position: Time): void;

    /**
     * Stop processing events. The scheduler will stop calling {@link run}. If the scheduler is already stopped then this
     * method won't do anything.
     */
    public abstract stop(): void;

    /**
     * Clear the {@link EventQueue}.
     */
    public abstract clearQueue(): void;

    /**
     * Schedule an event at a specified time location.
     *
     * @param time If it is inferior to the current time, the event will be executed on the next run.
     * @param time The event to schedule.
     *
     * @returns an EventRef that can used later on to cancel the event. See {@link cancel}.
     */
    public abstract schedule(time: Time, event: EventType): EventRef;

    /**
     * Cancel an action previously scheduled. If the action already was executed, this won't do anything.
     * See {@link schedule}.
     *
     * @param eventRef A reference to the scheduled action obtained from a call to {@link schedule}.
     */
    public abstract cancel(eventRef: EventRef): void;

    /**
     * Process the next scheduled events until the next event's time position is superior to the current time position plus
     * the specified {@link lookAhead}.
     */
    protected abstract run(): void;
}
