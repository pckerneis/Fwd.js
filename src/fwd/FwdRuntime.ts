import { FwdAudioImpl } from './audio/FwdAudioImpl';
import { FwdEditor } from './editor/FwdEditor';
import { Fwd } from './Fwd';
import { clearGuiManagers, fwdGui } from './gui/Gui';
import { fwdMidi } from './midi/FwdMidi';
import { FwdScheduler } from './scheduler/FwdScheduler';
import { clamp, map, parseNumber, random, simplex } from './utils/numbers';

const programs = new Map<String, Fwd>();

export function getContext(id: string): Fwd {
  const existing = programs.get(id);

  if (!! existing) return existing;

  const newContext = createContext();
  programs.set(id, newContext);

  return newContext;
}

function createContext(): Fwd {
  const scheduler = new FwdScheduler();
  const editor = new FwdEditor();
  const audio = new FwdAudioImpl(scheduler);

  return {
    scheduler,
    editor,
    audio,
    globals: {},
    gui: fwdGui,
    midi: fwdMidi,
    utils: {
      clamp, map, parseNumber, random, simplex,
    },
  };
}

export function startContext(fwd: Fwd): void {
  fwd.scheduler.clearEvents();

  fwd.audio.start();

  if (typeof fwd.onStart === 'function') {
    fwd.onStart();
  }

  fwd.scheduler.start();
}

export function renderOffline(fwd: Fwd, duration: number, sampleRate: number): Promise<AudioBuffer> {
  fwd.scheduler.clearEvents();

  const offlineContext = fwd.audio.startOffline(duration, sampleRate);
  fwd.onStart();
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
  clearGuiManagers();

  fwd.onStart = null;
  fwd.onStop = null;
  fwd.editor.reset();
  fwd.globals = {};
  fwd.scheduler.resetActions();
  fwd.scheduler.clearEvents();
}

export function forgetAllContexts(): void {
  programs.clear();
}
