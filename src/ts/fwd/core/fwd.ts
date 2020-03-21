import {
  Event,
  EventRef,
  Scheduler,
  SchedulerImpl,
  Time
} from '.';

import { FwdAudio } from '../audio/Audio';

let NOW: Time = 0;

class FwdEvent extends Event {
  private _stopped = false;

  constructor(
    public readonly time: Time,
    public readonly action: Function,
    public readonly cancelable: boolean
  ) {
    super();
  }

  trigger(now: Time) {
    NOW = now;

    if (! this._stopped) {
      this.action();
    }
  }

  stop() {
    if (this.cancelable) {
      this._stopped = true;
    }
  }
}

export interface Fwd {
  now: () => Time;
  schedule: (t: Time, fn: Function, preventCancel?: boolean) => EventRef;
  cancel: (ref: EventRef) => void;
  scheduler: Scheduler<FwdEvent>;
  start: () => void;
  stop: () => void;
  log: (...messages: any[]) => void;
  wait: (t: Time) => void;

  audio: FwdAudio;

  random: (a?: number, b?: number) => number;
}

export interface FwdLogger {
  log: (...messages: any[]) => void;
}

export interface FwdInitOptions {
  interval: number,
  lookAhead: number,
  fwdLogger: FwdLogger,
}

const defaultOptions: FwdInitOptions = {
  interval: 5,
  lookAhead: 100,
  fwdLogger: { log: console.log }
}

export function fwdInit(options: Partial<FwdInitOptions> = {}): Fwd {
  options = { ...defaultOptions, ...options };

  const scheduler = new SchedulerImpl<FwdEvent>(
    options.interval, options.lookAhead);

  function schedule(
    time: Time,
    action: Function, 
    preventCancel?: boolean) {
    const nextTime = NOW + time * 1000;
    return scheduler.schedule(nextTime, new FwdEvent(nextTime, action, ! preventCancel));
  }

  const log = (...messages: any[]) => {
    if (options.fwdLogger != null) {
      options.fwdLogger.log(messages);
    }
  }

  const stop = () => {
    scheduler.eventQueue.events.forEach((scheduledEvent) => {
      scheduledEvent.event.stop();
    });

    NOW = 0;
  }

  function wait(time: Time) {
    NOW += time * 1000;
  }

  const audio = new FwdAudio();

  const start = () => {
    NOW = 0;
    audio.start();
    scheduler.start(0);
  }

  const fwd = {
    now: () => NOW / 1000,
    scheduler,
    schedule,
    cancel : (ref: EventRef) => scheduler.cancel(ref),
    start,
    stop,
    log,
    audio,
    wait,
    random
  };
  
  audio.initializeModule(fwd);

  return fwd;
}

function random(a: number, b: number): number {
  if (a == null && b == null) {
    return Math.random();
  }

  if (b == null) {
    return a * Math.random();
  }

  return a + (b * Math.random());
}