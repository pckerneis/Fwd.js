import { Time } from '../EventQueue/EventQueue';

/**
 * Format a time value in milliseconds as `hh:mm:ss:mls`
 * @param time the milliseconds value to format
 */
export function formatTime(time: Time): string {
  if (time === null) {
    return null;
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const ms = Math.floor((time * 1000) % 1000);

  return [
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
    ms.toString().padStart(3, '0').substr(0, 3),
  ].join(':');
}
