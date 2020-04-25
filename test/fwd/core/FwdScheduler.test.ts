import { FwdScheduler } from "../../../src/fwd/core/FwdScheduler";
import { seconds, tolerantCompare } from "../../test-utils";

const mockAction = jest.fn(() => {});

const timeProvider = () => Date.now() / 1000;

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  mockAction.mockClear();
});

it ('triggers scheduled events', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  const t1 = 0;
  const t2 = 0.1;
  const t3 = 0.2;

  scheduler.schedule(t1, mockAction);
  scheduler.schedule(t2, mockAction);
  scheduler.schedule(t3, mockAction);
  scheduler.start();

  await seconds(t1 + 0.01);
  expect(mockAction).toHaveBeenCalledTimes(1);

  await seconds(t2 - t1);
  expect(mockAction).toHaveBeenCalledTimes(1);

  await seconds(t3 - t2);
  scheduler.stop();
  expect(mockAction).toHaveBeenCalledTimes(1);
});

it ('trigger non canceled events', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  scheduler.schedule(0, mockAction);
  const ref1 = scheduler.schedule(0, mockAction);
  const ref2 = scheduler.schedule(0, mockAction);

  scheduler.cancel(ref1);
  scheduler.start();
  scheduler.cancel(ref2);
  await seconds(0.1);
  scheduler.stop();

  expect(mockAction).toHaveBeenCalledTimes(1);
});

it ('stops firing events when not running', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  scheduler.schedule(0, mockAction);
  scheduler.schedule(0, mockAction);
  scheduler.schedule(0.2, mockAction);
  scheduler.schedule(0.2, mockAction);

  scheduler.start();
  await seconds(0.1);
  scheduler.stop();
  await seconds(0.2);

  expect(mockAction).toHaveBeenCalledTimes(2);
});

it ('change state and fire onEnded callback', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;
  const onEnded = jest.fn();
  scheduler.onEnded = onEnded;

  expect(scheduler.state).toBe('ready');
  scheduler.start();
  expect(scheduler.state).toBe('running');

  await seconds(0);
  scheduler.stop();
  expect(scheduler.state).toBe('stopping');

  await seconds(0.01);
  expect(scheduler.state).toBe('stopped');
  expect(onEnded).toHaveBeenCalledTimes(1);
});

it ('passes scoped time to events', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  const action1 = jest.fn(() => {
    expect(scheduler.now()).toBe(0.01);
    expect(scheduler.rtNow()).toBe(0.01);
  });

  const action2 = jest.fn(() => {
    expect(scheduler.now()).toBe(0.02);
    expect(scheduler.rtNow()).toBe(0.02);
  });

  scheduler.schedule(0.01, action1);
  scheduler.schedule(0.02, action2);
  scheduler.start();
  expect(scheduler.now()).toBe(0);
  expect(scheduler.rtNow()).toBe(0);
  await seconds(0.03);
  expect(scheduler.now()).toBe(0);

  // TODO : weird unit conversion here...
  expect(tolerantCompare(scheduler.rtNow(), (0.03 / 1000), 0.00001)).toBeTruthy();

  scheduler.stop();
});

it ('schedules no event when stopping', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  const action = jest.fn();

  scheduler.start();
  scheduler.stop();
  scheduler.schedule(0, action);

  expect(scheduler.state).toBe('stopping');
  await seconds(0.001);
  expect(scheduler.state).toBe('stopped');

  expect(action).not.toHaveBeenCalled();
});

it ('moves time pointer when wait is called', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  const action1 = jest.fn(() => {
    expect(scheduler.now()).toBe(0.01);
    expect(scheduler.rtNow()).toBe(0.01);
  });

  const action2 = jest.fn(() => {
    expect(scheduler.now()).toBe(0.02);
    expect(scheduler.rtNow()).toBe(0.02);
  });

  scheduler.schedule(0.01, action1);
  scheduler.wait(0.02);
  scheduler.schedule(0, action2);
  scheduler.start();
  expect(scheduler.now()).toBe(0);
  expect(scheduler.rtNow()).toBe(0);
  await seconds(0.03);
  expect(scheduler.now()).toBe(0);

  // TODO : weird unit conversion here...
  expect(tolerantCompare(scheduler.rtNow(), (0.03 / 1000), 0.00001)).toBeTruthy();

  scheduler.stop();
});

it ('throws exception when clearing events before stop is called', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  scheduler.start();
  expect(() => scheduler.clearEvents()).toThrowError();
  scheduler.stop();

  await seconds(0);
  expect(() => scheduler.clearEvents()).not.toThrowError();
});

it ('clears events', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  scheduler.schedule(0, () => {});
  scheduler.schedule(0, () => {});
  scheduler.schedule(0, () => {});

  scheduler.clearEvents();

  expect(scheduler['_scheduler'].eventQueue.events).toHaveLength(0);
  expect(scheduler.state).toBe('ready');
});

it ('throws exception when start is called but scheduler is not ready', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  scheduler.start();
  expect(() => scheduler.start()).toThrowError();
  scheduler.stop();
  expect(() => scheduler.start()).toThrowError();
  scheduler.clearEvents();
  expect(() => scheduler.start()).not.toThrowError();
});

it ('throws exception when stop is called but scheduler is not running', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  expect(scheduler.state).toBe('ready');
  expect(() => scheduler.stop()).toThrowError();
  scheduler.start();
  expect(scheduler.state).toBe('running');
  expect(() => scheduler.stop()).not.toThrowError();
  expect(scheduler.state).toBe('stopping');
  expect(() => scheduler.stop()).toThrowError();

  await seconds(0);
  expect(scheduler.state).toBe('stopped');
  expect(() => scheduler.stop()).toThrowError();
});

it ('fired FwdEvents change the scheduler\'s scoped time position', async () => {
  const scheduler = new FwdScheduler(1, 0);
  scheduler.timeProvider = timeProvider;

  scheduler.schedule(0.001, () => {
    expect(scheduler.now()).toBe(0.001);
  });

  scheduler.start();
  await seconds(0.01);
  scheduler.stop();
});

it ('non-cancellable events still fire when cancelled', async () => {
  const scheduler = new FwdScheduler(0.001, 0);
  scheduler.timeProvider = timeProvider;

  const action = jest.fn();

  scheduler.schedule(0.001, action, true);
  scheduler.schedule(0.001, action, false);

  scheduler.start();
  scheduler.stop();
  expect(scheduler['_scheduler'].eventQueue.events).toHaveLength(1);
  await seconds(0);
  expect(scheduler.state).toBe('stopping');
  await seconds(0.1);

  // TODO fixme !
  /*
  expect(scheduler.state).toBe('stopped');
  expect(action).toHaveBeenCalledTimes(1);
  */
});
