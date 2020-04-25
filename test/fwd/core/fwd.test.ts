import { fwd, putFwd } from "../../../src/fwd/core/fwd";
import { Logger, LoggerLevel } from "../../../src/fwd/utils/dbg";

Logger.runtimeLevel = LoggerLevel.none;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

it ('provides default log and err', () => {
  fwd.log('foo', 'bar');
  expect(console.log).toHaveBeenCalledWith('foo', 'bar');
  fwd.err('bar', 'foo');
  expect(console.error).toHaveBeenCalledWith('bar', 'foo');
});

it ('shows error for unexisting fwd properties', () => {
  const oopsy = (fwd as any).anything;
  expect(oopsy).toBe(undefined);
  expect(console.error).toHaveBeenCalledTimes(1);
});

it ('puts Fwd instance', () => {
  (fwd as any).foo = 'bar';
  putFwd(fwd);

  expect((fwd as any).foo).toBe('bar');
  expect((fwd as any).anything).toBe(undefined);
  expect(console.error).toHaveBeenCalledTimes(1);
});