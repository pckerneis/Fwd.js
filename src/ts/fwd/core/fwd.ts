import {
  EventRef,
  Time
} from '.';

import { FwdAudio } from '../audio/Audio';
import { FwdControls } from '../control/FwdControl';
import { FwdScheduler } from './FwdScheduler';
import { FwdLogger } from './FwdLogger';

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

export function putFwd(fwdInstance: Fwd) {
  fwd = new Proxy(fwdInstance, proxyHandler) as Fwd;
}

export const fwdDefaultInstance = {
  log(...messages: any[]) { console.log(...messages); },
  err(...messages: any[]) { console.error(...messages); }
};

const proxyHandler = {
  get: function(obj: any, prop: string) {
    if (prop in obj) {
      return obj[prop];
    }

    fwd.err(`You're trying to use the undefined property '${prop}' of fwd. Make sure fwd was properly initialized with all needed modules.`)
    return undefined;
  }
}

export let fwd: Fwd = new Proxy(fwdDefaultInstance, proxyHandler) as Fwd;