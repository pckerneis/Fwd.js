import { FwdAudioImpl } from "../../../src/fwd/audio/FwdAudioImpl";
import * as FwdAudioTrackModule from '../../../src/fwd/audio/nodes/FwdAudioTrack';
import * as FwdEntryPoint from "../../../src/fwd/core/fwd";
import { Fwd, fwd } from "../../../src/fwd/core/fwd";
import { Logger, LoggerLevel } from "../../../src/fwd/utils/dbg";
import { mockError, mockFwd } from "../../mocks/Fwd.mock";
import { mockAudioContext, mockAudioNode, mockAudioParam } from "../../mocks/WebAudio.mock";

Logger.runtimeLevel = LoggerLevel.none;

const mockAudioTrack = jest.fn().mockImplementation((fwdAudio, trackName) => {
  return {
    _muteForSoloGainNode: mockAudioNode('gain'),
    muteForSolo: jest.fn(),
    unmuteForSolo: jest.fn(),
    listeners: [],
    trackName,
    tearDown: jest.fn(),
  }
});

describe('FwdAudioImpl', () => {

  beforeAll(() => {
    mockError.mockClear();
    mockFwd.mockClear();
    mockAudioTrack.mockClear();
    mockAudioNode.mockClear();
    mockAudioContext.mockClear();
    mockAudioParam.mockClear();

    (FwdEntryPoint as any).fwd = mockFwd();

    (global as any).AudioContext = mockAudioContext;

    (FwdAudioTrackModule as any).FwdAudioTrack = mockAudioTrack;
  });

  it('prepares AudioContext when start is called', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());
    expect(fwdAudio.isContextReady).toBeFalsy();
    fwdAudio.start();
    expect(fwdAudio.isContextReady).toBeTruthy();
  });

  it('prevents adding a track with existing name', () => {
    const fwdAudio = new FwdAudioImpl();

    const track1 = fwdAudio.addTrack('track0');
    fwdAudio.addTrack('track0');
    expect(mockError).toHaveBeenCalled();
    expect(fwdAudio.getTrack('track0')).toBe(track1);
  });

  it('allows track removal', () => {
    const fwdAudio = new FwdAudioImpl();

    fwdAudio.addTrack('trackToRemove');
    fwdAudio.removeTrack('trackToRemove');
    expect(mockError).not.toHaveBeenCalled();
    expect(fwdAudio.getTrack('trackToRemove')).toBeNull();
    expect(fwdAudio.tracks.length).toBe(0);
    expect(mockError).toHaveBeenCalled();
  });

  it('shows error when trying to remove non existing track', () => {
    const fwdAudio = new FwdAudioImpl();

    fwdAudio.removeTrack('track0');
    expect(mockError).toHaveBeenCalled();
  });

  it('manages solo tracks', () => {
    const fwdAudio = new FwdAudioImpl();

    const track1 = fwdAudio.addTrack('track1');
    const track2 = fwdAudio.addTrack('track2');
    const track3 = fwdAudio.addTrack('track3');

    fwdAudio.soloTrack(track1.trackName);
    expect(track1.unmuteForSolo).toHaveBeenCalledTimes(1);
    expect(track2.muteForSolo).toHaveBeenCalledTimes(1);
    expect(track3.muteForSolo).toHaveBeenCalledTimes(1);

    track3.listeners.push({
      onTrackSolo: jest.fn(),
      onTrackUnsolo: jest.fn(),
      onTrackMute: undefined,
      onTrackUnmute: undefined,
      onTrackPanChange: undefined,
      onTrackVolumeChange: undefined,
    });

    fwdAudio.soloTrack(track3.trackName);
    expect(track1.muteForSolo).toHaveBeenCalledTimes(1);
    expect(track2.muteForSolo).toHaveBeenCalledTimes(2);
    expect(track3.unmuteForSolo).toHaveBeenCalledTimes(1);

    expect(track3.listeners[0].onTrackSolo).toHaveBeenCalledTimes(1);

    fwdAudio.unsoloAllTracks();
    expect(track1.unmuteForSolo).toHaveBeenCalledTimes(2);
    expect(track2.unmuteForSolo).toHaveBeenCalledTimes(1);
    expect(track3.unmuteForSolo).toHaveBeenCalledTimes(2);

    expect(track3.listeners[0].onTrackUnsolo).toHaveBeenCalledTimes(1);
  });

  it('mutes new tracks if a track is in solo', () => {
    const fwdAudio = new FwdAudioImpl();

    const track1 = fwdAudio.addTrack('track1');
    fwdAudio.soloTrack('track1');
    expect(track1.unmuteForSolo).toHaveBeenCalled();

    const track2 = fwdAudio.addTrack('track2');
    expect(track2.muteForSolo).toHaveBeenCalledTimes(1);
  });

  it('unmute all tracks when the soloed track was removed', () => {
    const fwdAudio = new FwdAudioImpl();

    const track1 = fwdAudio.addTrack('track1');
    const track2 = fwdAudio.addTrack('track2');
    const track3 = fwdAudio.addTrack('track3');

    fwdAudio.soloTrack(track1.trackName);
    fwdAudio.removeTrack(track1.trackName);

    expect(track2.unmuteForSolo).toHaveBeenCalledTimes(1);
    expect(track3.unmuteForSolo).toHaveBeenCalledTimes(1);
  });

  it('shows error message when trying to solo a non existing track', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.soloTrack('oopsies');

    expect(mockError).toHaveBeenCalled();
  });

  it('does nothing when unsoling all tracks but none was soloed', () => {
    const fwdAudio = new FwdAudioImpl();
    const track = fwdAudio.addTrack('not in solo');
    fwdAudio.unsoloAllTracks();

    expect(track.unmuteForSolo).not.toHaveBeenCalled();
  });

  it('creates various audio nodes', () => {
    const fwd = mockFwd();
    (global as any).fwd = fwd;

    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(fwd);
    fwdAudio.start();

    // Bypass FWD initialization check
    // @ts-ignore
    fwdAudio['_fwd'] = fwd;

    // We need to provide fetch
    (global as any).fetch = jest.fn().mockImplementation(() => {
      return new Promise(jest.fn());
    });

    fwdAudio.gain();
    fwdAudio.sampler('');
    fwdAudio.osc();
    fwdAudio.noise();
    fwdAudio.lfo();
    fwdAudio.stereoDelay();
    fwdAudio.delayLine(1);
  });

  it('has master gain node', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());
    fwdAudio.start();
    expect(fwdAudio.master).toBeTruthy();
  });

  it('sets fwd\'s time provider when initialized', () => {
    const fwdAudio = new FwdAudioImpl();

    const mockScheduler = jest.fn().mockImplementation(() => {
      return {
        timeProvider: null,
      };
    });

    fwd.scheduler = mockScheduler();
    fwd.now = jest.fn().mockImplementation(() => 10);

    fwdAudio.initializeModule(fwd);
    fwdAudio.start();

    expect(fwd.scheduler.timeProvider).not.toBeNull();
    expect(fwd.scheduler.timeProvider()).toBe(42);

    expect(fwdAudio.now()).toBe(52);
  });

  it('tears down all tracks on audio context reset', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());
    fwdAudio.start();
    const track = fwdAudio.addTrack('');
    fwdAudio.start();
    expect(track.tearDown).toHaveBeenCalledTimes(1);
    expect(fwdAudio.soloedTrack).toBeNull();
  });

  it('throws error when trying to create a node before initialization', () => {
    const fwdAudio = new FwdAudioImpl();

    expect(() => fwdAudio.gain()).toThrowError();
    expect(() => fwdAudio.osc()).toThrowError();
    expect(() => fwdAudio.sampler('')).toThrowError();
    expect(() => fwdAudio.noise()).toThrowError();
    expect(() => fwdAudio.lfo()).toThrowError();
  });

  it('doesn\'t kill init time audio tracks', () => {
    const fwd = mockFwd() as Fwd;
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(fwd);

    const trackToKeep = fwdAudio.addTrack('trackToKeep');
    fwd.performanceListeners.forEach((l) => l.onPerformanceAboutToStart());
    fwdAudio.addTrack('trackToRemove');
    expect(fwdAudio.tracks.length).toBe(2);

    fwdAudio.start();

    expect(fwdAudio.tracks.length).toBe(1);
    expect(fwdAudio.tracks[0]).toBe(trackToKeep);

    const initTrack = fwdAudio.addTrack('trackToKeep');
    expect(initTrack).toBe(trackToKeep);

    const initTimeTracks = fwdAudio['_initTimeTracks'];

    // Second init should'nt affect init time tracks
    fwdAudio.addTrack('trackNotInit');
    fwd.performanceListeners.forEach((l) => l.onPerformanceAboutToStart());

    expect(fwdAudio['_initTimeTracks']).toBe(initTimeTracks);
  });

  it('notifies listeners when a track is added or removed', () => {
    const fwdAudio = new FwdAudioImpl();

    fwdAudio.listeners.push({
      audioTrackAdded: jest.fn(),
      audioTrackRemoved: jest.fn(),
      audioContextStarted: jest.fn(),
    });

    fwdAudio.addTrack('t1');
    fwdAudio.addTrack('t2');
    fwdAudio.removeTrack('t1');

    expect(fwdAudio.listeners[0].audioTrackAdded).toHaveBeenCalledTimes(2);
    expect(fwdAudio.listeners[0].audioTrackRemoved).toHaveBeenCalledTimes(1);
  });

  it('notifies listeners when audio context started', () => {
    const fwdAudio = new FwdAudioImpl();

    fwdAudio.listeners.push({
      audioTrackAdded: jest.fn(),
      audioTrackRemoved: jest.fn(),
      audioContextStarted: jest.fn(),
    });

    fwdAudio.initializeModule(mockFwd());
    fwdAudio.start();

    expect(fwdAudio.listeners[0].audioContextStarted).toHaveBeenCalledTimes(1);
  });

  it('notifies listeners when a track is soloed or un-soloed', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());
    fwdAudio.start();

    const track1 = fwdAudio.addTrack('myTrack');
    const track2 = fwdAudio.addTrack('myTrack2');

    track1.listeners.push({
      onTrackSolo: jest.fn(),
      onTrackUnsolo: jest.fn(),
    });

    track2.listeners.push({
      onTrackSolo: jest.fn(),
      onTrackUnsolo: jest.fn(),
    });

    fwdAudio.soloTrack(track1.trackName);

    expect(track1.listeners[0].onTrackSolo).toHaveBeenCalledTimes(1);

    fwdAudio.soloTrack(track2.trackName);
    expect(track1.listeners[0].onTrackUnsolo).toHaveBeenCalledTimes(1);
    expect(track2.listeners[0].onTrackSolo).toHaveBeenCalledTimes(1);

    fwdAudio.unsoloAllTracks();
    expect(track1.listeners[0].onTrackUnsolo).toHaveBeenCalledTimes(1);
    expect(track2.listeners[0].onTrackUnsolo).toHaveBeenCalledTimes(1);
  });

  it('won\'t break if given bad listeners', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());
    fwdAudio.start();

    // FwdAudio listener
    fwdAudio.listeners.push({
      audioContextStarted: undefined,
      audioTrackRemoved: null,
      // @ts-ignore
      audioTrackAdded: {},
    });

    // Track listener
    const track = fwdAudio.addTrack('myTrack');

    track.listeners.push({
      onTrackSolo: undefined,
      // @ts-ignore
      onTrackUnsolo: 'hey',
    });

    expect(() => fwdAudio.soloTrack(track.trackName)).not.toThrow();
    expect(() => fwdAudio.addTrack('123')).not.toThrow();
    expect(() => fwdAudio.soloTrack('123')).not.toThrow();
    expect(() => fwdAudio.soloTrack(track.trackName)).not.toThrow();
    expect(() => fwdAudio.unsoloAllTracks()).not.toThrow();
    expect(() => fwdAudio.removeTrack('123')).not.toThrow();
    expect(() => fwdAudio.start()).not.toThrow();
  });
});