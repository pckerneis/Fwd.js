import { SchedulerImpl } from "../../../../src/client/fwd/core/Scheduler/SchedulerImpl";
import { Logger, LoggerLevel } from "../../../../src/client/fwd/utils/Logger";
import { waitSeconds } from "../../../test-utils";

Logger.runtimeLevel = LoggerLevel.none;

const mockEventTrigger = jest.fn(() => {});

const mockBasicEvent = jest.fn().mockImplementation(() => {
  return {
    trigger: mockEventTrigger,
  }
});

const TIME = {
  now: 0,
};

const mockPerformanceNow = jest.fn().mockImplementation(() => TIME.now);

const mockPerformance = jest.fn().mockImplementation(() => {
  return {
    now: mockPerformanceNow,
  }
});

describe('SchedulerImpl', () => {
  beforeEach(() => {
    // This ugly line is needed for mocking 'jsdom' global
    Object.defineProperty((global as any).performance, 'now', { value: mockPerformanceNow, writable: true });

    jest.useFakeTimers();
    mockPerformance.mockClear();
    mockPerformanceNow.mockClear();
    TIME.now = 0;
    (global as any).performance = mockPerformance();

    // Clear all instances and calls to constructor and all methods:
    mockBasicEvent.mockClear();
    mockEventTrigger.mockClear();
  });

  it ('creates', async () => {
    const scheduler = new SchedulerImpl(1, 3);
    expect(scheduler).toBeTruthy();
    expect(scheduler.interval).toBe(1);
    expect(scheduler.lookAhead).toBe(3);
  });

  it ('has interval greater than minimal interval', () => {
    const scheduler = new SchedulerImpl(-10, 0);
    expect(scheduler.interval).toBe(SchedulerImpl.MIN_INTERVAL);
    scheduler.interval = -100;
    expect(scheduler.interval).toBe(SchedulerImpl.MIN_INTERVAL);
    scheduler.interval = 100;
    expect(scheduler.interval).toBe(100);
  });

  it ('has positive lookAhead', () => {
    const scheduler = new SchedulerImpl(-10, -10);

    expect(scheduler.lookAhead).toBeGreaterThanOrEqual(0);
    scheduler.lookAhead = -100;
    expect(scheduler.lookAhead).toBeGreaterThanOrEqual(0);
    scheduler.lookAhead = 100;
    expect(scheduler.lookAhead).toBe(100);
  });

  it ('triggers scheduled events', () => {
    const scheduler = new SchedulerImpl(0, 0);
    const t1 = 0;
    const t2 = 0.1;
    const t3 = 0.2;

    scheduler.schedule(t1, mockBasicEvent());
    scheduler.schedule(t2, mockBasicEvent());
    scheduler.schedule(t3, mockBasicEvent());
    scheduler.start(0);

    waitSeconds(0, TIME);
    expect(mockEventTrigger).toHaveBeenCalledWith(t1);

    waitSeconds(t2, TIME);
    expect(mockEventTrigger).toHaveBeenCalledWith(t2);

    waitSeconds(t2, TIME);
    scheduler.stop();
    expect(mockEventTrigger).toHaveBeenCalledWith(t3);
  });

  it ('stops when all events were triggered and keepAlive is set to false', () => {
    const scheduler = new SchedulerImpl(0, 0);
    scheduler.keepAlive = false;
    scheduler.onEnded = jest.fn();

    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.start(0);

    waitSeconds(0.5, TIME);
    expect(mockEventTrigger).toHaveBeenCalledTimes(3);
    expect(scheduler.running).toBeFalsy();
    expect(scheduler.onEnded).toHaveBeenCalledWith();
  });

  it ('goes on when all events were triggered and keepAlive is set to true', () => {
    const scheduler = new SchedulerImpl(0, 0);
    scheduler.keepAlive = true;
    scheduler.onEnded = jest.fn();

    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.start(0);

    waitSeconds(0.1, TIME);
    expect(mockEventTrigger).toHaveBeenCalledTimes(3);
    expect(scheduler.running).toBeTruthy();
    expect(scheduler.onEnded).not.toHaveBeenCalled();

    scheduler.stop();
  });

  it ('trigger non canceled events', () => {
    const scheduler = new SchedulerImpl(0, 0);

    scheduler.schedule(0, mockBasicEvent());
    const ref1 = scheduler.schedule(0, mockBasicEvent());
    const ref2 = scheduler.schedule(0, mockBasicEvent());

    scheduler.cancel(ref1);
    scheduler.cancel(ref2);
    scheduler.start(0);
    waitSeconds(0, TIME);
    scheduler.stop();

    expect(mockEventTrigger).toHaveBeenCalledTimes(1);
  });

  it ('stops firing events when not running', () => {
    const scheduler = new SchedulerImpl(0, 0);

    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0.2, mockBasicEvent());
    scheduler.schedule(0.2, mockBasicEvent());

    scheduler.start(0);
    waitSeconds(0, TIME);
    scheduler.stop();
    waitSeconds(0.2, TIME);

    expect(mockEventTrigger).toHaveBeenCalledTimes(2);
  });

  it ('fire no events when cleared', () => {
    const scheduler = new SchedulerImpl(0, 0);

    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0.2, mockBasicEvent());
    scheduler.schedule(0.2, mockBasicEvent());

    scheduler.start(0);
    waitSeconds(0.1, TIME);
    scheduler.clearQueue();
    waitSeconds(0.2, TIME);
    scheduler.stop();

    expect(mockEventTrigger).toHaveBeenCalledTimes(2);
  });

  it ('fire no events when stopping', () => {
    const scheduler = new SchedulerImpl(0, 0);

    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0, mockBasicEvent());
    scheduler.schedule(0.2, mockBasicEvent());
    scheduler.schedule(0.2, mockBasicEvent());

    scheduler.start(0);
    waitSeconds(0.1, TIME);
    scheduler.clearQueue();
    waitSeconds(0.2, TIME);
    scheduler.stop();

    expect(mockEventTrigger).toHaveBeenCalledTimes(2);
  });

  it ('cannot run if state is not "running"', () => {
    const scheduler = new SchedulerImpl(0, 10);

    const action = jest.fn();
    scheduler.schedule(0, mockBasicEvent());

    scheduler['run']();

    expect(action).not.toHaveBeenCalled();
  });

  it ('uses performance.now() as a default time provider', () => {
    const scheduler = new SchedulerImpl(0, 10);
    scheduler.start(0);
    expect(mockPerformanceNow).toHaveBeenCalled();
  });
});
