import audit from "../../../src/fwd/utils/audit";
import { seconds } from "../../test-utils";

test('should filter events with audit', async () => {
  const spy = jest.fn();
  const fire = audit(spy, 50);

  setTimeout(fire, 0);
  setTimeout(fire, 10);
  setTimeout(fire, 20);

  expect(spy).toHaveBeenCalledTimes(0);
  await seconds(0.055);
  expect(spy).toHaveBeenCalledTimes(1);
  await seconds(0.055);
  expect(spy).toHaveBeenCalledTimes(1);
});

test('should still filter events with audit with default time', async () => {
  const spy = jest.fn();
  const fire = audit(spy);

  setTimeout(fire, 0);
  setTimeout(fire, 5);
  setTimeout(fire, 10);

  expect(spy).toHaveBeenCalledTimes(0);
  await seconds(0.025);
  expect(spy).toHaveBeenCalledTimes(1);
  await seconds(0.025);
  expect(spy).toHaveBeenCalledTimes(1);
});
