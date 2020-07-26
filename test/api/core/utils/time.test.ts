import { formatTime } from "../../../../src/utils/time";

test('formats time', () => {
  expect(formatTime(null)).toBeNull();
  expect(formatTime(0)).toBe('00:00:000');
  expect(formatTime(0.01)).toBe('00:00:010');
  expect(formatTime(1)).toBe('00:01:000');
  expect(formatTime(60)).toBe('01:00:000');
  expect(formatTime(3600)).toBe('60:00:000');
});
