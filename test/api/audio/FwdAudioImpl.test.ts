import { FwdAudioImpl } from '../../../src/fwd/audio/FwdAudioImpl';
import { mockFwd, mockScheduler } from '../../mocks/Fwd.mock';
import { mockAudioContext, mockAudioParam } from '../../mocks/WebAudio.mock';

describe('FwdAudioNode', () => {
  beforeEach(() => {
    mockFwd.mockClear();
    global['AudioContext'] = mockAudioContext;
    global['OfflineAudioContext'] = mockAudioContext;
    global['AudioParam'] = mockAudioParam;

    // We need to provide fetch for FwdSamplerNode
    (global as any).fetch = jest.fn().mockImplementation(() => {
      return new Promise(jest.fn());
    });
  });

  it('should prepare audio context and master when started', () => {
    const scheduler = mockScheduler();
    const fwdAudio = new FwdAudioImpl(scheduler);

    expect(fwdAudio.isContextReady).toBeFalsy();
    expect(fwdAudio.context).toBeUndefined();
    expect(fwdAudio.master).toBeUndefined();

    fwdAudio.start();
    expect(fwdAudio.isContextReady).toBeTruthy();
    expect(fwdAudio.context).not.toBeNull();
    expect(fwdAudio.master).not.toBeNull();
  });

  it('should prepare offline audio context and master when started', () => {
    const scheduler = mockScheduler();
    const fwdAudio = new FwdAudioImpl(scheduler);

    expect(fwdAudio.isContextReady).toBeFalsy();
    expect(fwdAudio.context).toBeUndefined();
    expect(fwdAudio.master).toBeUndefined();

    fwdAudio.startOffline(10, 88200);
    expect(fwdAudio.isContextReady).toBeTruthy();
    expect(fwdAudio.context).not.toBeNull();
    expect(fwdAudio.master).not.toBeNull();
  });

  it('should prepare offline audio context with default sampleRate', () => {
    const scheduler = mockScheduler();
    const fwdAudio = new FwdAudioImpl(scheduler);
    fwdAudio.startOffline(10);
    expect(fwdAudio.isContextReady).toBeTruthy();
    expect(fwdAudio.context).not.toBeNull();
    expect(fwdAudio.master).not.toBeNull();
  });

  it('should tear down existing master node when resetting audio context', () => {
    const scheduler = mockScheduler();
    const fwdAudio = new FwdAudioImpl(scheduler);
    const tearDownMock = jest.fn();

    fwdAudio.start();
    fwdAudio['_masterGain']['tearDown'] = tearDownMock;

    fwdAudio.start();

    expect(tearDownMock).toHaveBeenCalledTimes(1);
  });

  it('should throw when trying to create nodes whereas context is not ready', () => {
    const scheduler = mockScheduler();
    const fwdAudio = new FwdAudioImpl(scheduler);

    expect(() => fwdAudio.gain()).toThrowError();
    expect(() => fwdAudio.osc()).toThrowError();
    expect(() => fwdAudio.lfo()).toThrowError();
    expect(() => fwdAudio.sampler('')).toThrowError();
    expect(() => fwdAudio.noise()).toThrowError();
    expect(() => fwdAudio.delayLine(1.0)).toThrowError();
    expect(() => fwdAudio.stereoDelay()).toThrowError();
    expect(() => fwdAudio.distortion(1.0)).toThrowError();
    expect(() => fwdAudio.compressor()).toThrowError();
    expect(() => fwdAudio.reverb()).toThrowError();

    fwdAudio.start();
    expect(() => fwdAudio.gain()).not.toThrowError();
    expect(() => fwdAudio.osc()).not.toThrowError();
    expect(() => fwdAudio.lfo()).not.toThrowError();
    expect(() => fwdAudio.sampler('')).not.toThrowError();
    expect(() => fwdAudio.noise()).not.toThrowError();
    expect(() => fwdAudio.delayLine(1.0)).not.toThrowError();
    expect(() => fwdAudio.stereoDelay()).not.toThrowError();
    expect(() => fwdAudio.distortion(1.0)).not.toThrowError();
    expect(() => fwdAudio.compressor()).not.toThrowError();
    expect(() => fwdAudio.reverb()).not.toThrowError();
  });
});
