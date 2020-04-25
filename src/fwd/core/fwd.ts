import { FwdAudio } from "../audio/FwdAudio";
import { FwdControls } from '../control/FwdControl';
import { EventRef, Time } from './EventQueue/EventQueue';
import { FwdLogger } from './FwdLogger';
import { FwdScheduler } from './FwdScheduler';

export interface FwdPerformanceListener {
  onPerformanceAboutToStart(): void;
  onPerformanceStart(): void;
  onPerformanceEnd(): void;
}

/**
 * The Fwd runtime main interface. It exposes the scheduler as well as core modules such as `audio` or `controls`
 * and utility methods such as `log`. Its main purpose is to offer a nice way to manipulate data over time in a
 * creative context.
 *
 * You wouldn't create your own Fwd instance but rather use a {@link FwdRunner} that will set it up for you so that you
 * just need to import the global `fwd` instance.
 */
export interface Fwd {
  /**
   * Returns the current time position for the scheduler. It's only useful when called inside the `FwdScheduler`'s
   * execution stack as otherwise it will always return `0`.
   * 
   * @returns The current position of the scheduler's head in seconds.
   */
  now: () => Time;

  /**
   * Move the current time position of the scheduler.
   *
   * @param time A positive duration in seconds.
   */
  wait: (time: Time) => void;

  /**
   * Schedule an action. The time passed in is relative to the current time position of the scheduler.
   *
   * @param time The delay before the action gets executed.
   * @param action A function to be called at the specified time.
   * @param preventCancel If `true`, the action will be triggered even if `fwd.stop` was called. Use it
   *   with caution in situations where an action must be followed by another no matter what.
   *
   * @returns an `EventRef` that allows to cancel the event. See {@link cancel}.
   */
  schedule: (time: Time, action: Function, preventCancel?: boolean) => EventRef;

  /**
   * Cancel an action previously scheduled. If the action already was executed, this won't do anything.
   * See {@link schedule}.
   *
   * @param eventRef A reference to the scheduled action obtained from a call to {@link schedule}.
   */
  cancel: (eventRef: EventRef) => void;

  /**
   * The {@link FwdScheduler} attached to this Fwd runtime.
   */
  scheduler: FwdScheduler;

  /**
   * Log debug messages based on the linked {@link FwdLogger} configuration.
   */
  log: (...messages: any[]) => void;

  /**
   * Log error messages based on the linked {@link FwdLogger} configuration.
   */
  err: (...messages: any[]) => void;

  /**
   * The Fwd audio module. See {@link FwdAudio}.
   */
  audio?: FwdAudio;

  /**
   * The Fwd controls module. See {@link FwdControls}.
   */
  controls?: FwdControls;

  /**
   * The Fwd logger module. See {@link FwdLogger}.
   */
  logger?: FwdLogger;

  /**
   * Generates a pseudo-random number between the specified bounds. The generated number will be between the lower
   * bound (inclusive) and the upper bound (exclusive). If no arguments as provided, it will output a number between
   * 0 and 1. If one argument is provided, it will output a number between 0 and this argument. If both arguments
   * are present, it will output a number between these two numbers.
   * Parameters can be negative or positive numbers. When both parameters are present, the order doesn't matter.
   *
   * @param a If `b` is not provided, `a` is the upper bound and the lower bound is `0`.
   *          If `b` is provided, `a` is the lower bound.
   * @param b Upper bound.
   */
  random: (a?: number, b?: number) => number;

  /**
   * An array of listeners to be notified when the performance state changes.
   */
  performanceListeners: FwdPerformanceListener[];
}

/**
 * A utility function to set the global `fwd` runtime instance. It shouldn't be called from within sketches but
 * only when initializing the Fwd runtime.
 */
export function putFwd(fwdInstance: Fwd): void {
  fwd = new Proxy(fwdInstance, proxyHandler) as Fwd;
}

const fwdDefaultInstance = {
  log(...messages: any[]): void {
    console.log(...messages);
  },
  err(...messages: any[]): void {
    console.error(...messages);
  },
};

const proxyHandler = {
  get: function (obj: any, prop: string): any {
    if (prop in obj) {
      return obj[prop];
    }

    fwd.err(`You're trying to use the undefined property '${prop}' of fwd. `
      + `Make sure fwd was properly initialized with all needed modules.`);
    return undefined;
  },
};

/**
 * The current instance for the Fwd runtime. This is the main entry point in a Fwd sketch: just import it
 * and you're ready to go!
 */
export let fwd: Fwd = new Proxy(fwdDefaultInstance, proxyHandler) as Fwd;
