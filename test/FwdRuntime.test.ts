import {
  forgetAllContexts,
  getContext,
  renderOffline,
  resetContext,
  startContext,
  stopContext,
} from '../src/fwd/FwdRuntime';
import { mockAudioContext, mockAudioParam } from './mocks/WebAudio.mock';


describe('FwdRuntime', () => {
  beforeEach(() => {
    window.AudioContext = mockAudioContext;
    window.AudioParam = mockAudioParam;
    window.OfflineAudioContext = mockAudioContext;
    forgetAllContexts();
  });

  it('should get contexts', () => {
    const ctx1 = getContext('ctx1');
    expect(ctx1).not.toBeNull();

    const ctx2 = getContext('ctx2');
    expect(ctx2).not.toBeNull();
    expect(ctx2).not.toBe(ctx1);

    const ctx3 = getContext('ctx1');
    expect(ctx3).toBe(ctx1);
  });

  it('should start a context', () => {
    const ctx1 = getContext('ctx1');
    ctx1.onStart = jest.fn();

    startContext(ctx1);

    expect(ctx1.onStart).toHaveBeenCalled();
  });

  it('should start a context offline', () => {
    const ctx1 = getContext('ctx1');
    ctx1.onStart = jest.fn();

    renderOffline(ctx1, 1, 44100);

    expect(window.OfflineAudioContext).toHaveBeenCalled();
  });

  it('should stop a context', () => {
    jest.useFakeTimers();

    const ctx1 = getContext('ctx1');
    ctx1.onStop = jest.fn();

    const endCallback = jest.fn();

    startContext(ctx1);
    stopContext(ctx1, endCallback);

    expect(ctx1.onStop).toHaveBeenCalled();

    jest.runAllTimers();

    expect(endCallback).toHaveBeenCalled();
  });

  it('should reset a context', () => {
    jest.useFakeTimers();

    const ctx1 = getContext('ctx1');

    ctx1.onStart = jest.fn();

    startContext(ctx1);
    stopContext(ctx1, () =>  resetContext(ctx1));

    jest.runAllTimers();

    expect(ctx1.onStart).toBeNull();
    expect(ctx1.globals).toStrictEqual({});
  });
});
