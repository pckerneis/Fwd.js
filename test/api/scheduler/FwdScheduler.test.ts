import { FwdScheduler } from "../../../src/fwd/scheduler/FwdScheduler";
import { SchedulerImpl } from "../../../src/fwd/scheduler/Scheduler/SchedulerImpl";
import { Logger, LoggerLevel } from "../../../src/fwd/utils/Logger";
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
    Object.defineProperty((global as any).performance, 'now', {value: mockPerformanceNow, writable: true});

    jest.useFakeTimers();
    mockPerformance.mockClear();
    mockPerformanceNow.mockClear();
    TIME.now = 0;
    (global as any).performance = mockPerformance();

    scheduler = new FwdScheduler(0.005, 0.001);
  });

  it('creates with default values', () => {
    const defaultScheduler = new FwdScheduler();
    expect(defaultScheduler['_scheduler'].interval).toBe(SchedulerImpl.MIN_INTERVAL);
    expect(defaultScheduler['_scheduler'].lookAhead).toBe(SchedulerImpl.DEFAULT_LOOKAHEAD);
  });

  it('triggers scheduled events', async () => {
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

  it('triggers events scheduled with scheduleNow', async () => {
    scheduler.clockFunction = () => mockPerformanceNow() / 1000;
    scheduler.scheduleNow(mockAction);
    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('trigger non canceled events', async () => {
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

  it('stops firing events when not running', async () => {
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

  it('passes scoped time to events', async () => {
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

  it('schedules no event when stopping', async () => {
    const action = jest.fn();

    scheduler.start();
    scheduler.stop();
    scheduler.schedule(0, action);

    expect(scheduler.state).toBe('stopping');
    await waitSeconds(0.001, TIME);
    expect(scheduler.state).toBe('ready');

    expect(action).not.toHaveBeenCalled();
  });

  it('throws exception when start is called but scheduler is not ready', async () => {
    scheduler.start();
    expect(() => scheduler.start()).toThrowError();
    scheduler.stop();
    expect(() => scheduler.start()).toThrowError();
  });

  it('throws exception when stop is called but scheduler is not running', async () => {
    expect(scheduler.state).toBe('ready');
    expect(() => scheduler.stop()).toThrowError();
    scheduler.start();
    expect(scheduler.state).toBe('running');
    expect(() => scheduler.stop()).not.toThrowError();
    expect(scheduler.state).toBe('stopping');
    expect(() => scheduler.stop()).not.toThrowError();

    await waitSeconds(0, TIME);
    expect(scheduler.state).toBe('ready');
    expect(() => scheduler.stop()).toThrowError();
  });

  it('fired FwdEvents change the scheduler\'s scoped time position', async () => {
    scheduler.schedule(0.001, () => {
      expect(scheduler.now()).toBe(0.001);
    });

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
  });

  it('non-cancellable events still fire when cancelled', async () => {
    const action = jest.fn();

    scheduler.schedule(0.01, action, true);
    scheduler.schedule(0.01, action, false);

    scheduler.start();
    scheduler.stop();
    expect(scheduler['_scheduler'].eventQueue.events).toHaveLength(1);
    expect(scheduler.state).toBe('stopping');

    await waitSeconds(0.010, TIME);

    expect(scheduler.state).toBe('ready');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('sets time provider', async () => {
    scheduler.clockFunction = () => 2;
    scheduler.start();                        // start is 2
    scheduler.clockFunction = () => 44;
    await waitSeconds(0, TIME);                   // start is now - start, 44 - 2
    expect(scheduler.clock()).toBe(42);
  });

  it('create event chains', async () => {
    const chain = scheduler.fire(() => {
    }).wait(1).fire('action1');
    expect(chain.events.length).toBe(3);
  });

  it('fires event chains', async () => {
    const action1 = jest.fn();
    scheduler.set('action1', action1);
    scheduler.fire(action1).wait(1).fire('action1').trigger();

    scheduler.start();
    await waitSeconds(1, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(2);
  });

  it('catch errors for fired events in chains', async () => {
    console.error = jest.fn();

    const error = new Error();

    const throwingAction = () => {
      throw error;
    };
    scheduler.set('action1', throwingAction);
    scheduler.fire(throwingAction).fire('action1').trigger();

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('shows error when providing bad argument to fire', async () => {
    console.error = jest.fn();

    scheduler
      // @ts-ignore
      .fire(123456)     // bad type
      .fire('action1')  // undefined key
      .trigger();

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('should continue after a truthy continueIf condition', async () => {
    const action1 = jest.fn();

    scheduler
      .fire(action1)
      .continueIf(() => true)
      .fire(action1)
      .trigger();

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(2);
  });

  it('should break a chain with falsy continueIf condition', async () => {
    const action1 = jest.fn();

    scheduler
      .fire(action1)
      .continueIf(() => false)
      .fire(action1)
      .trigger();

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(1);
  });

  it('should accept functions in wait', async () => {
    const action1 = jest.fn();

    scheduler
      .wait(() => 1)
      .fire(action1)
      .wait(() => 1)
      .fire(action1)
      .trigger();

    scheduler.start();
    await waitSeconds(1.5, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(1);
  });

  it('should stop after continueIfStillRunning', async () => {
    const action1 = jest.fn();

    scheduler
      .wait(() => 1)
      .continueIfStillRunning()
      .fire(action1)
      .trigger();

    scheduler.start();
    await waitSeconds(0.5, TIME);
    scheduler.stop();
    await waitSeconds(1, TIME);
    expect(action1).toHaveBeenCalledTimes(0);
  });

  it('should continue after continueIfStillRunning', async () => {
    const action1 = jest.fn();

    scheduler
      .wait(() => 0.5)
      .continueIfStillRunning()
      .fire(action1)
      .trigger();

    scheduler.start();
    await waitSeconds(1, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(1);
  });

  it('should concatenate event chains', async () => {
    const action1 = jest.fn();

    const chain1 = scheduler
      .fire(action1);

    const chain2 = scheduler
      .fire(action1);

    chain1
      .concat(chain2)
      .trigger();

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(2);
  });

  it('should still concatenate with empty event chains', async () => {
    const action1 = jest.fn();

    const chain1 = scheduler.chain();
    const chain2 = scheduler
      .fire(action1);

    chain1
      .concat(chain2)
      .trigger();

    scheduler.start();
    await waitSeconds(0.01, TIME);
    scheduler.stop();
    expect(action1).toHaveBeenCalledTimes(1);
  });

  it('should not trigger a chain when not ready or running', async () => {
    const actionMock = jest.fn();
    const chain = scheduler.wait(0).fire(actionMock);
    scheduler.start();
    scheduler.stop();
    chain.trigger();

    await waitSeconds(0.01, TIME);

    expect(actionMock).not.toHaveBeenCalled();
  });

  it('should run sync', async () => {
    const action1 = jest.fn();

    scheduler
      .fire(action1)
      .wait(() => 100)
      .fire(action1)
      .wait(() => 100)
      .fire(action1)
      .trigger();

    scheduler.runSync(150);
    expect(action1).toHaveBeenCalledTimes(2);
  });

  it('should reset defined actions', async () => {
    const definedAction = () => {};
    scheduler.set('hey', definedAction);
    expect(scheduler.get('hey')).toBe(definedAction);
    scheduler.resetActions();
    expect(scheduler.get('hey')).toBeUndefined();
  });
});
