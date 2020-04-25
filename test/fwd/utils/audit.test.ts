import audit from "../../../src/fwd/utils/audit";
import { seconds } from "../../test-utils";

test('should filter events with audit', async () => {
  const spy = jest.fn();
  const fire = audit(spy, 10);

  for (let i = 0; i < 5; ++i) {
    await seconds(0.0001);
    fire();
  }

  expect(spy).toHaveBeenCalledTimes(0);

  await seconds(0.01);
  expect(spy).toHaveBeenCalledTimes(1);
});