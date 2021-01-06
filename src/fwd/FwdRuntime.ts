import { FwdAudioImpl } from './audio/FwdAudioImpl';
import { Fwd } from './Fwd';
import { fwdMidi } from './midi/FwdMidi';
import { FwdScheduler } from './scheduler/FwdScheduler';
import { clamp, map, parseNumber, random, simplex } from './utils/numbers';

const programs = new Map<String, Fwd>();

export function getContext(id: string): Fwd {
  const existing = programs.get(id);

  if (existing) return existing;

  const newContext = createContext();
  programs.set(id, newContext);

  return newContext;
}

function createContext(): Fwd {
  const scheduler = new FwdScheduler();
  const audio = new FwdAudioImpl(scheduler);

  return {
    scheduler,
    audio,
    midi: fwdMidi,
    utils: {
      clamp, map, parseNumber, random, simplex,
    },
  };
}

export function startContext(fwd: Fwd): void {
  fwd.audio.start();

  if (typeof fwd.onStart === 'function') {
    fwd.onStart();
  }

  fwd.scheduler.start();
}

export function renderOffline(fwd: Fwd, duration: number, sampleRate: number): Promise<AudioBuffer> {
  const offlineContext = fwd.audio.startOffline(duration, sampleRate);

  if (typeof fwd.onStart === 'function') {
    fwd.onStart();
  }

  fwd.scheduler.runSync(duration);

  return offlineContext.startRendering();
}

export function stopContext(fwd: Fwd, endCallback: Function): void {
  fwd.scheduler.stop(() => {
    endCallback();
  });

  if (typeof fwd.onStop === 'function') {
    fwd.onStop();
  }
}

export function resetContext(fwd: Fwd): void {
  fwd.onStart = undefined;
  fwd.onStop = undefined;
  fwd.scheduler.resetActions();
}

export function forgetAllContexts(): void {
  programs.clear();
}
