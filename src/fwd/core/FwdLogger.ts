import { Time } from './EventQueue/EventQueue';

export interface FwdLogger {
  /**
   * Print messages in the console with a timestamp prefix
   *
   * @param time time position in milliseconds
   * @param messages the messages to print
   */
  log: (time: Time, ...messages: any[]) => void;

  /**
   * Print error messages in the console with a timestamp prefix.
   *
   * @param time time position in milliseconds
   * @param messages the messages to print
   */
  err: (time: Time, ...messages: any[]) => void;
}
