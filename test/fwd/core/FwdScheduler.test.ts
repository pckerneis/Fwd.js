import { FwdScheduler } from "../../../src/client/fwd/core/FwdScheduler";
import { SchedulerImpl } from "../../../src/client/fwd/core/Scheduler/SchedulerImpl";
import { Logger, LoggerLevel } from "../../../src/client/fwd/utils/Logger";
import { waitSeconds } from "../../test-utils";

Logger.runtimeLevel = LoggerLevel.none;

const mockAction = jest.fn(() => {});

let scheduler: FwdScheduler;

const TIME = {
  now: 0,
};

const mockPerformanceNow = jest.fn().mockImplementation(() => TIME.now);

const mockPerformance = jest.fn().mockImplementation(() => {
  return {
    now: mockPerformanceNow,
  }
});

describe('FwdScheduler', () => {
  beforeEach(() => {
    // This ugly line is needed for mocking 'jsdom' global
    Object.defineProperty((global as any).performance, 'now', { value: mockPerformanceNow, writable: true });

    jest.useFakeTimers();
    mockPerformance.mockClear();
    mockPerformanceNow.mockClear();
    TIME.now = 0;
    (global as any).performance = mockPerformance();

    scheduler = new FwdScheduler(0.005, 0.001);
  });

  it ('creates with default values', () => {
    const defaultScheduler = new FwdScheduler();
    expect(defaultScheduler['_scheduler'].interval).toBe(SchedulerImpl.MIN_INTERVAL);
    expect(defaultScheduler['_scheduler'].lookAhead).toBe(SchedulerImpl.DEFAULT_LOOKAHEAD);
  });

  it ('triggers scheduled events', async () => {
    scheduler.clockFunction = () => mockPerformanceNow() / 1000;

    const t1 = 0;
    const t2 = 0.01;
    const t3 = 0.02;

    scheduler.schedule(t1, mockAction);
    scheduler.schedule(t2, mockAction);
    scheduler.schedule(t3, mockAction);

    scheduler.start();
    expect(mockAction).toHaveBeenCalledTimes(1);

    await waitSeconds(0.01, TIME);

    expect(mockAction).toHaveBeenCalledTimes(2);

    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(mockAction).toHaveBeenCalledTimes(3);
  });

  it ('trigger non canceled events', async () => {
    scheduler.schedule(0, mockAction);
    const ref1 = scheduler.schedule(0, mockAction);
    const ref2 = scheduler.schedule(0, mockAction);

    scheduler.cancel(ref1);
    scheduler.cancel(ref2);
    scheduler.start();
    await waitSeconds(0.1, TIME);
    scheduler.stop();

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it ('stops firing events when not running', async () => {
    const t2 = 0.2;

    scheduler.schedule(0, mockAction);
    scheduler.schedule(0, mockAction);
    scheduler.schedule(t2, mockAction);
    scheduler.schedule(t2, mockAction);

    scheduler.start();
    expect(mockAction).toHaveBeenCalledTimes(2);
    await waitSeconds(0, TIME);
    scheduler.stop();
    await waitSeconds(t2, TIME);
    expect(mockAction).toHaveBeenCalledTimes(2);
  });

  it ('change state and fire onEnded callback', async () => {
    const onEnded = jest.fn();
    scheduler.onEnded = onEnded;

    expect(scheduler.state).toBe('ready');
    scheduler.start();
    expect(scheduler.state).toBe('running');

    await waitSeconds(0, TIME);
    scheduler.stop();
    expect(scheduler.state).toBe('stopping');

    await waitSeconds(0.01, TIME);
    expect(scheduler.state).toBe('stopped');
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it ('passes scoped time to events', async () => {
    const action1 = jest.fn(() => {
      expect(scheduler.now()).toBe(0.01);
    });

    const action2 = jest.fn(() => {
      expect(scheduler.now()).toBe(0.02);
    });

    scheduler.schedule(0.01, action1);
    scheduler.schedule(0.02, action2);
    scheduler.start();
    // expect(tolerantCompare(scheduler.rtNow(), 0, timeTolerance)).toBeTruthy();
    expect(scheduler.now()).toBe(0);
    await waitSeconds(0.03, TIME);
    // expect(tolerantCompare(scheduler.rtNow(), 0.03, timeTolerance)).toBeTruthy();
    expect(scheduler.now()).toBe(0);

    scheduler.stop();
  });

  it ('schedules no event when stopping', async () => {
    const action = jest.fn();

    scheduler.start();
    scheduler.stop();
    scheduler.schedule(0, action);

    expect(scheduler.state).toBe('stopping');
    await waitSeconds(0.001, TIME);
    expect(scheduler.state).toBe('stopped');

    expect(action).not.toHaveBeenCalled();
  });

  it ('moves time pointer when wait is called', async () => {
    const action1 = jest.fn(() => {
      expect(scheduler.now()).toBe(0.01);
    });

    const action2 = jest.fn(() => {
      expect(scheduler.now()).toBe(0.02);
    });

    scheduler.schedule(0.01, action1);
    scheduler.wait(0.02);
    scheduler.schedule(0, action2);
    scheduler.start();
    expect(scheduler.now()).toBe(0);
    await waitSeconds(0.03, TIME);
    expect(scheduler.now()).toBe(0);

    scheduler.stop();
  });

  it ('throws exception when clearing events before stop is called', async () => {
    scheduler.start();
    expect(() => scheduler.clearEvents()).toThrowError();
    scheduler.stop();

    await waitSeconds(0, TIME);
    expect(() => scheduler.clearEvents()).not.toThrowError();
  });

  it ('clears events', async () => {
    scheduler.schedule(0, () => {});
    scheduler.schedule(0, () => {});
    scheduler.schedule(0, () => {});

    scheduler.clearEvents();

    expect(scheduler['_scheduler'].eventQueue.events).toHaveLength(0);
    expect(scheduler.state).toBe('ready');
  });

  it ('throws exception when start is called but scheduler is not ready', async () => {
    scheduler.start();
    expect(() => scheduler.start()).toThrowError();
    scheduler.stop();
    expect(() => scheduler.start()).toThrowError();
    scheduler.clearEvents();
    expect(() => scheduler.start()).not.toThrowError();
  });

  it ('throws exception when stop is called but scheduler is not running', async () => {
    expect(scheduler.state).toBe('ready');
    expect(() => scheduler.stop()).toThrowError();
    scheduler.start();
    expect(scheduler.state).toBe('running');
    expect(() => scheduler.stop()).not.toThrowError();
    expect(scheduler.state).toBe('stopping');
    expect(() => scheduler.stop()).toThrowError();

    await waitSeconds(0, TIME);
    expect(scheduler.state).toBe('stopped');
    expect(() => scheduler.stop()).toThrowError();
  });

  it ('fired FwdEvents change the scheduler\'s scoped time position', async () => {
    scheduler.schedule(0.001, () => {
      expect(scheduler.now()).toBe(0.001);
    });

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
  });

  it ('non-cancellable events still fire when cancelled', async () => {
    const action = jest.fn();

    scheduler.schedule(0.01, action, true);
    scheduler.schedule(0.01, action, false);

    scheduler.start();
    scheduler.stop();
    expect(scheduler['_scheduler'].eventQueue.events).toHaveLength(1);
    expect(scheduler.state).toBe('stopping');

    await waitSeconds(0.010, TIME);

    expect(scheduler.state).toBe('stopped');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it ('sets time provider', async () => {
    scheduler.clockFunction = () => 2;
    scheduler.start();                        // start is 2
    scheduler.clockFunction = () => 44;
    await waitSeconds(0, TIME);                   // start is now - start, 44 - 2
    expect(scheduler.clock()).toBe(42);
  });
});
