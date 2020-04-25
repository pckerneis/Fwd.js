import { FwdAudioImpl } from "../../../src/fwd/audio/FwdAudioImpl";
import * as FwdAudioTrackModule from '../../../src/fwd/audio/nodes/FwdAudioTrack';
import * as FwdEntryPoint from "../../../src/fwd/core/fwd";
import { fwd } from "../../../src/fwd/core/fwd";
import Mock = jest.Mock;

const mockFwd = jest.fn().mockImplementation(() => {
  return {
    err: mockError,
  };
});

const mockAudioParam = jest.fn().mockImplementation(() => {
  return {
    setValueAtTime: jest.fn(),
  }
});

const mockAudioNode = jest.fn().mockImplementation(() => {
  return {
    start: jest.fn(),
    connect: jest.fn().mockImplementation(() => {
      return mockAudioNode();
    }),
  }
});

function createAudioNodeFactoryMock(...audioParams: string[]): Mock {
  const audioNode = mockAudioNode();

  audioParams.forEach(param => {
    audioNode[param] = mockAudioParam()
  });

  return jest.fn().mockImplementation(() => {
    return audioNode;
  });
}

const mockAudioContext = jest.fn().mockImplementation(() => {
  return {
    currentTime: 42,
    createGain: createAudioNodeFactoryMock('gain'),
    createOscillator: createAudioNodeFactoryMock('frequency'),
    createBufferSource: createAudioNodeFactoryMock(),
    createConstantSource: createAudioNodeFactoryMock(),
    createBuffer: jest.fn().mockImplementation(() => {
      return {
        getChannelData: jest.fn(),
      }
    }),
  }
});

const mockError = jest.fn().mockImplementation((...messages) => console.log(...messages));

const mockAudioTrack = jest.fn().mockImplementation((fwdAudio, trackName) => {
  return {
    _muteForSoloGainNode: mockAudioNode('gain'),
    _muteForSolo: jest.fn(),
    _unmuteForSolo: jest.fn(),
    listeners: [],
    trackName,
    tearDown: jest.fn(),
  }
});

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
  expect(track1['_unmuteForSolo']).toHaveBeenCalledTimes(1);
  expect(track2['_muteForSolo']).toHaveBeenCalledTimes(1);
  expect(track3['_muteForSolo']).toHaveBeenCalledTimes(1);

  track3.listeners.push({
    onTrackSolo: jest.fn(),
    onTrackUnsolo: jest.fn(),
    onTrackMute: undefined,
    onTrackUnmute: undefined,
  });

  fwdAudio.soloTrack(track3.trackName);
  expect(track1['_muteForSolo']).toHaveBeenCalledTimes(1);
  expect(track2['_muteForSolo']).toHaveBeenCalledTimes(2);
  expect(track3['_unmuteForSolo']).toHaveBeenCalledTimes(1);

  expect(track3.listeners[0].onTrackSolo).toHaveBeenCalledTimes(1);

  fwdAudio.unsoloAllTracks();
  expect(track1['_unmuteForSolo']).toHaveBeenCalledTimes(2);
  expect(track2['_unmuteForSolo']).toHaveBeenCalledTimes(1);
  expect(track3['_unmuteForSolo']).toHaveBeenCalledTimes(2);

  expect(track3.listeners[0].onTrackUnsolo).toHaveBeenCalledTimes(1);
});

it('mutes new tracks if a track is in solo', () => {
  const fwdAudio = new FwdAudioImpl();
  // TODO: here we start the audio because muting a new track is only done when audio was initialized, which sucks
  fwdAudio.start();

  const track1 = fwdAudio.addTrack('track1');
  fwdAudio.soloTrack('track1');
  expect(track1['_unmuteForSolo']).toHaveBeenCalled();

  const track2 = fwdAudio.addTrack('track2');
  expect(track2['_muteForSolo']).toHaveBeenCalledTimes(1);
});

it('unmute all tracks when the soloed track was removed', () => {
  const fwdAudio = new FwdAudioImpl();

  const track1 = fwdAudio.addTrack('track1');
  const track2 = fwdAudio.addTrack('track2');
  const track3 = fwdAudio.addTrack('track3');

  fwdAudio.soloTrack(track1.trackName);
  fwdAudio.removeTrack(track1.trackName);

  expect(track2['_unmuteForSolo']).toHaveBeenCalledTimes(1);
  expect(track3['_unmuteForSolo']).toHaveBeenCalledTimes(1);
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

  expect(track['_unmuteForSolo']).not.toHaveBeenCalled();
});

it('creates various audio nodes', () => {
  const fwdAudio = new FwdAudioImpl();
  fwdAudio.start();

  // Bypass FWD initialization check
  // @ts-ignore
  fwdAudio['_fwd'] = jest.fn();

  // We need to provide fetch
  (global as any).fetch = jest.fn().mockImplementation(() => {
    return new Promise(jest.fn());
  });

  fwdAudio.gain();
  fwdAudio.sampler('');
  fwdAudio.osc();
  fwdAudio.noise();
  fwdAudio.lfo();
});

it('has master gain node', () => {
  const fwdAudio = new FwdAudioImpl();
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

test('tears down all tracks on audio context reset', () => {
  const fwdAudio = new FwdAudioImpl();
  fwdAudio.start();
  const track = fwdAudio.addTrack('');
  fwdAudio.start();
  expect(track.tearDown).toHaveBeenCalledTimes(1);
  expect(fwdAudio['_soloTrack']).toBeNull();
});

test('throws error when trying to create a node before initialization', () => {
  const fwdAudio = new FwdAudioImpl();

  expect(() => fwdAudio.gain()).toThrowError();
  expect(() => fwdAudio.osc()).toThrowError();
  expect(() => fwdAudio.sampler('')).toThrowError();
  expect(() => fwdAudio.noise()).toThrowError();
  expect(() => fwdAudio.lfo()).toThrowError();
});