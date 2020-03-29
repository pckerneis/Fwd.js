import { Time } from '../EventQueue/EventQueue';

export function formatTime(t: Time): string {
  if (t === null) {
    return null;
  }

  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60);
  const ms = Math.floor((t * 1000) % 1000);

  return [
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
    ms.toString().padStart(3, '0').substr(0, 3),
  ].join(':');
}
