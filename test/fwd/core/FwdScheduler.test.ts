import { FwdScheduler } from "../../../src/fwd/core/FwdScheduler";
import { seconds } from "../../test-utils";

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
