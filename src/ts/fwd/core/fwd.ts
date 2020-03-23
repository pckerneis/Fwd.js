import { FwdAudio } from '../audio/Audio';
import { FwdControls } from '../control/FwdControl';
import { FwdLogger } from './FwdLogger';
import { FwdScheduler } from './FwdScheduler';
import { Time, EventRef } from './EventQueue/EventQueue';

export interface Fwd {
  now: () => Time;
  schedule: (t: Time, fn: Function, preventCancel?: boolean) => EventRef;
  cancel: (ref: EventRef) => void;
  scheduler: FwdScheduler;
  start: () => void;
  stop: () => void;

  log: (...messages: any[]) => void;
  err: (...messages: any[]) => void;

  wait: (t: Time) => void;

  audio?: FwdAudio;
  controls?: FwdControls;
  logger?: FwdLogger;

  random: (a?: number, b?: number) => number;
}

export interface FwdInitOptions {
  interval: number,
  lookAhead: number
}

export function putFwd(fwdInstance: Fwd): void {
  fwd = new Proxy(fwdInstance, proxyHandler) as Fwd;
}

export const fwdDefaultInstance = {
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

export let fwd: Fwd = new Proxy(fwdDefaultInstance, proxyHandler) as Fwd;
