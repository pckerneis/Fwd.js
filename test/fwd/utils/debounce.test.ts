import debounce from "../../../src/client/fwd/utils/time-filters/debounce";

beforeEach(() => {
  jest.useFakeTimers();
});

test('should filter events with debounce', () => {
  const spy = jest.fn();
  const fire = debounce(spy, 50);

  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(20);
  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(20);
  fire();

  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(20);
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(30);
  expect(spy).toHaveBeenCalledTimes(1);
});

test('should still filter events with debounce with default time', () => {
  const spy = jest.fn();
  const fire = debounce(spy);

  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(10);
  fire();
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(10);
  fire();

  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(10);
  expect(spy).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(10);
  expect(spy).toHaveBeenCalledTimes(1);
});
