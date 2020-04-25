import { EventQueueImpl } from "../../../../src/fwd/core/EventQueue/EventQueueImpl";
import { SchedulerImpl } from "../../../../src/fwd/core/Scheduler/SchedulerImpl";
import { seconds } from "../../../test-utils";

const mockEventTrigger = jest.fn(() => {});

const mockBasicEvent = jest.fn().mockImplementation(() => {
  return {
    trigger: mockEventTrigger,
  }
});

const timeProvider = () => Date.now() / 1000;

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  mockBasicEvent.mockClear();
  mockEventTrigger.mockClear();
});

it ('should create', async () => {
  const scheduler = new SchedulerImpl(1, 3);
  expect(scheduler).toBeTruthy();
  expect(scheduler.interval).toBe(1);
  expect(scheduler.lookAhead).toBe(3);
});

it ('has interval greater than minimal interval', async () => {
  const scheduler = new SchedulerImpl(-10, 0);
  expect(scheduler.interval).toBe(SchedulerImpl.MIN_INTERVAL);
  scheduler.interval = -100;
  expect(scheduler.interval).toBe(SchedulerImpl.MIN_INTERVAL);
  scheduler.interval = 100;
  expect(scheduler.interval).toBe(100);
});

it ('has positive lookAhead', async () => {
  const scheduler = new SchedulerImpl(-10, -10);

  expect(scheduler.lookAhead).toBeGreaterThanOrEqual(0);
  scheduler.lookAhead = -100;
  expect(scheduler.lookAhead).toBeGreaterThanOrEqual(0);
  scheduler.lookAhead = 100;
  expect(scheduler.lookAhead).toBe(100);
});

it ('triggers scheduled events', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);
  const t1 = 0;
  const t2 = 0.1;
  const t3 = 0.2;

  scheduler.schedule(t1, mockBasicEvent());
  scheduler.schedule(t2, mockBasicEvent());
  scheduler.schedule(t3, mockBasicEvent());
  scheduler.start(0);

  await seconds(t1 + 0.01);
  expect(mockEventTrigger).toHaveBeenCalledWith(t1);

  await seconds(t2 - t1);
  expect(mockEventTrigger).toHaveBeenCalledWith(t2);

  await seconds(t3 - t2);
  scheduler.stop();
  expect(mockEventTrigger).toHaveBeenCalledWith(t3);
});

it ('stops when all events were triggered and keepAlive is set to false', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);
  scheduler.keepAlive = false;
  scheduler.onEnded = jest.fn();

  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.start(0);

  await seconds(0.5);
  expect(mockEventTrigger).toHaveBeenCalledTimes(3);
  expect(scheduler.running).toBeFalsy();
  expect(scheduler.onEnded).toHaveBeenCalledWith();
});

it ('goes on when all events were triggered and keepAlive is set to true', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);
  scheduler.keepAlive = true;
  scheduler.onEnded = jest.fn();

  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.start(0);

  await seconds(0.1);
  expect(mockEventTrigger).toHaveBeenCalledTimes(3);
  expect(scheduler.running).toBeTruthy();
  expect(scheduler.onEnded).not.toHaveBeenCalled();

  scheduler.stop();
});

it ('trigger non canceled events', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);

  scheduler.schedule(0, mockBasicEvent());
  const ref1 = scheduler.schedule(0, mockBasicEvent());
  const ref2 = scheduler.schedule(0, mockBasicEvent());

  scheduler.cancel(ref1);
  scheduler.start(0);
  scheduler.cancel(ref2);
  await seconds(0.1);
  scheduler.stop();

  expect(mockEventTrigger).toHaveBeenCalledTimes(1);
});

it ('stops firing events when not running', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);

  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0.2, mockBasicEvent());
  scheduler.schedule(0.2, mockBasicEvent());

  scheduler.start(0);
  await seconds(0.1);
  scheduler.stop();
  await seconds(0.2);

  expect(mockEventTrigger).toHaveBeenCalledTimes(2);
});

it ('fire no events when cleared', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);

  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0.2, mockBasicEvent());
  scheduler.schedule(0.2, mockBasicEvent());

  scheduler.start(0);
  await seconds(0.1);
  scheduler.clearQueue();
  await seconds(0.2);
  scheduler.stop();

  expect(mockEventTrigger).toHaveBeenCalledTimes(2);
});

it ('fire no events when stopping', async () => {
  const eventQueue = new EventQueueImpl<any>();
  const scheduler = new SchedulerImpl(1, 0, eventQueue, timeProvider);

  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0, mockBasicEvent());
  scheduler.schedule(0.2, mockBasicEvent());
  scheduler.schedule(0.2, mockBasicEvent());

  scheduler.start(0);
  await seconds(0.1);
  scheduler.clearQueue();
  await seconds(0.2);
  scheduler.stop();

  expect(mockEventTrigger).toHaveBeenCalledTimes(2);
});

it ('cannot run if state is not "running"', async () => {
  const scheduler = new SchedulerImpl(0.01, 10);

  const action = jest.fn();
  scheduler.schedule(0, mockBasicEvent());

  scheduler['run']();

  expect(action).not.toHaveBeenCalled();
});

it ('uses performance.now() as a default time provider', async () => {
  const performanceNowMock = jest.fn();
  const performanceMock = jest.fn().mockImplementation(() => {
    return { now: performanceNowMock }
  });

  (global as any).performance = performanceMock();

  const scheduler = new SchedulerImpl(0.01, 10);
  scheduler.start(0);
  await seconds(0);
  scheduler.stop();
  expect(performanceNowMock).toHaveBeenCalled();
});
