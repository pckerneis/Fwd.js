import { EventQueue, EventRef, Time } from '../EventQueue/EventQueue';

/**
 * Encapsulates an action in a `trigger` method.
 */
export interface Action {
    /**
     * Triggers the action for this event.
     */
    trigger(): void;
}

/**
 * Real-time scheduler. It maintains a list of events that can be added with {@link schedule}. Once the scheduler is
 * started, `run` gets repeatedly called, iterating over the next elements to find the events that should be fired.
 *
 * The Scheduler class is parametrized with an ActionType which extends {@link Action}. At the minimum, an Action should
 * have a `trigger` method which is called by the scheduler when the event should be fired.
 */
export interface Scheduler<ActionType extends Action> {

    /**
     * A method that will be called if {@link keepAlive} is set to `true` and there's no events to process at the end of a
     * run.
     */
    onEnded: Function;

    /**
     * When set to `true`, the scheduler won't stop running if there are no more events scheduled. This comes handy when you
     * don't know in advance what events you'll process.
     */
    keepAlive: boolean;

    /**
     * The {@link EventQueue} this scheduler is using.
     */
    readonly eventQueue: EventQueue<ActionType>;

    /**
     * Is this scheduler currently running ?
     */
    readonly running: boolean;

    /**
     * The delay between the end of a run and the next one, in seconds.
     */
    readonly interval: number;

    /**
     * The time range in which events will be considered as ready to be fired, in seconds.
     */
    readonly lookAhead: number;

    /**
     * Set the scheduler's time keeper.
     *
     * @param timeProvider a function that returns the current time in seconds.
     */
    timeProvider: () => number;

    /**
     * Returns the current time position for the scheduler in seconds. It's only useful when called inside the
     * scheduler's execution stack as otherwise it will always return `0`.
     *
     * @returns The current position of the scheduler's head in seconds.
     */
    now(): Time;

    /**
     * Start processing the event queue from a specified time position. If the scheduler is already started then this method
     * won't do anything.
     *
     * @param position A time position to start at, in seconds.
     */
    start(position: Time): void;

    /**
     * Stop processing events. The scheduler will stop calling {@link run}. If the scheduler is already stopped then this
     * method won't do anything.
     */
    stop(): void;

    runSync(start: Time, end: Time): void

    /**
     * Clear the {@link EventQueue}.
     */
    clearQueue(): void;

    /**
     * Schedule an event at a specified time location.
     *
     * @param time If it is inferior to the current time, the event will be executed on the next run.
     * @param event The event to schedule.
     *
     * @returns an EventRef that can used later on to cancel the event. See {@link cancel}.
     */
    schedule(time: Time, event: ActionType): EventRef;

    /**
     * Cancel an action previously scheduled. If the action already was executed, this won't do anything.
     * See {@link schedule}.
     *
     * @param eventRef A reference to the scheduled action obtained from a call to {@link schedule}.
     */
    cancel(eventRef: EventRef): void;
}
