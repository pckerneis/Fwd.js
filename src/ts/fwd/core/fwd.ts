import {
  Event,
  EventRef,
  Scheduler,
  SchedulerImpl,
  Time
} from '.';

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
}

export interface FwdLogger {
  log: (...messages: any[]) => void;
}

export interface FwdInitOptions {
  interval: number,
  lookAhead: number,
  fwdLogger: FwdLogger,
  timeTransform: TimeTransform
}

interface TimeTransform {
  fromMs(ms: Time): any;
  toMs(value: any): Time;
}

class SecondTransform implements TimeTransform{
  fromMs(ms: number) {
    return ms / 1000;
  }

  toMs(value: any): number {
    return value * 1000;
  }
}

const defaultOptions: FwdInitOptions = {
  interval: 5,
  lookAhead: 40,
  fwdLogger: { log: console.log },
  timeTransform: new SecondTransform()
}

export function fwdInit(options: Partial<FwdInitOptions> = {}): Fwd {
  options = { ...defaultOptions, ...options };

  const scheduler = new SchedulerImpl<FwdEvent>(
    options.interval, options.lookAhead);

  function schedule(
    time: Time,
    action: Function, 
    preventCancel?: boolean) {
    const nextTime = NOW + options.timeTransform.toMs(time);
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
  }

  return {
    now: () => options.timeTransform.fromMs(NOW),
    scheduler,
    schedule,
    cancel : (ref) => scheduler.cancel(ref),
    start: () => scheduler.start(0),
    stop,
    log
  };
}
