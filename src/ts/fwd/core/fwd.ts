import {
  Event,
  EventRef,
  Scheduler,
  SchedulerImpl,
  Time
} from '.';

let NOW: Time = 0;

class FwdEvent extends Event {
  constructor(
    public readonly time: Time,
    public readonly action: Function
  ) {
    super();
  }

  trigger(now: Time) {
    NOW = now;
    this.action();
  }
}

export interface Fwd {
  now: () => Time;
  schedule: (t: Time, fn: Function) => EventRef;
  cancel: (ref: EventRef) => void;
  scheduler: Scheduler<FwdEvent>;
  start: () => void;
  log: (...messages: any[]) => void;
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
  interval: 35,
  lookAhead: 15,
  fwdLogger: { log: console.log },
}

export function fwdInit(options: Partial<FwdInitOptions> = {}): Fwd {
  options = { ...defaultOptions, ...options };

  const scheduler = new SchedulerImpl<FwdEvent>(
    options.interval, options.lookAhead);

  const schedule = (time: Time, action: Function) => {
    const nextTime = NOW + time * 1000;
    return scheduler.schedule(nextTime, new FwdEvent(nextTime, action));
  }
  
  const cancel = (ref: EventRef) => {
    scheduler.cancel(ref);
  }

  const start = () => {
    scheduler.start();
  }

  const log = (...messages: any[]) => {
    if (options.fwdLogger != null) {
      options.fwdLogger.log(messages);
    }
  }

  return {
    now: () => NOW / 1000,
    schedule,
    cancel,
    scheduler,
    start,
    log
  };
}
