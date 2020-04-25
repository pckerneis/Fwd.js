import debounce from "../../../src/fwd/utils/debounce";
import { seconds } from "../../test-utils";

test('should filter events with debounce', async () => {
  const spy = jest.fn();
  const fire = debounce(spy, 10);

  for (let i = 0; i < 5; ++i) {
    await seconds(0.0001);
    fire();
  }

  expect(spy).toHaveBeenCalledTimes(0);

  await seconds(0.01);
  expect(spy).toHaveBeenCalledTimes(1);
});