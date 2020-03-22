import { Time } from './EventQueue/EventQueue';

export interface FwdLogger {
  log: (time: Time, ...messages: any[]) => void;
  err: (time: Time, ...messages: any[]) => void;
}
