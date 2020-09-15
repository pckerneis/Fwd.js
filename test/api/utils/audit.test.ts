import audit from '../../src/fwd/utils/time-filters/audit';

beforeEach(() => {
  jest.useFakeTimers();
});

test('should filter events with audit', () => {
  const spy = jest.fn();
  const fire = audit(spy, 50);

  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(20);
  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(20);
  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(20);
  expect(spy).toHaveBeenCalledTimes(1);
});

test('should still filter events with audit with default time', () => {
  const spy = jest.fn();
  const fire = audit(spy);

  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(10);
  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(5);
  fire();

  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(10);
  expect(spy).toHaveBeenCalledTimes(1);
});
