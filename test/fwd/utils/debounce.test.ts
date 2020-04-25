import debounce from "../../../src/fwd/utils/debounce";
import { seconds } from "../../test-utils";

test('should filter events with debounce', async () => {
  const spy = jest.fn();
  const fire = debounce(spy, 50);

  setTimeout(fire, 0);
  setTimeout(fire, 10);
  setTimeout(fire, 20);

  expect(spy).toHaveBeenCalledTimes(0);
  await seconds(0.055);
  expect(spy).toHaveBeenCalledTimes(0);
  await seconds(0.055);
  expect(spy).toHaveBeenCalledTimes(1);
});

test('should still filter events with debounce with default time', async () => {
  const spy = jest.fn();
  const fire = debounce(spy);

  setTimeout(fire, 0);
  setTimeout(fire, 5);
  setTimeout(fire, 10);

  expect(spy).toHaveBeenCalledTimes(0);
  await seconds(0.025);
  expect(spy).toHaveBeenCalledTimes(0);
  await seconds(0.025);
  expect(spy).toHaveBeenCalledTimes(1);
});