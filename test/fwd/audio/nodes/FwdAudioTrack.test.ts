import { FwdAudio } from "../../../../src/fwd/audio/FwdAudio";
import { FwdAudioImpl } from "../../../../src/fwd/audio/FwdAudioImpl";
import { FwdAudioTrack } from "../../../../src/fwd/audio/nodes/FwdAudioTrack";
import { Logger, LoggerLevel } from "../../../../src/fwd/utils/dbg";
import { mockFwd } from "../../../Fwd.mock";
import { mockAudioContext } from "../../../WebAudio.mock";
import Mock = jest.Mock;

Logger.runtimeLevel = LoggerLevel.none;

const mockFwdAudio: Mock<FwdAudio> = jest.fn().mockImplementation(() => {
  return {
    listeners: [],
    isContextReady: false,
    master: {},
    tracks: [],
    soloedTrack: null,

    initializeModule: jest.fn(),
    start: jest.fn(),
    now: jest.fn(),

    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    getTrack: jest.fn(),
    soloTrack: jest.fn(),
    unsoloAllTracks: jest.fn(),

    gain: jest.fn(),
    osc: jest.fn(),
    lfo: jest.fn(),
    sampler: jest.fn(),
    noise: jest.fn(),
  };
});

describe('FwdAudioTrack', () => {
  beforeEach(() => {
    mockFwd.mockClear();

    (global as any).AudioContext = mockAudioContext;
  });

  it ('creates a track', () => {
    const track = new FwdAudioTrack(mockFwdAudio(), 'track', {gain: 1, mute: false, pan: 0});
    expect(track).toBeTruthy();
  });

  it ('prepare audio nodes at construction', () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = true;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    expect(track).toBeTruthy();
    expect(audioContext.createGain).toHaveBeenCalledTimes(3);
    expect(audioContext.createStereoPanner).toHaveBeenCalledTimes(1);

    expect(track.inputNode).not.toBeNull();
    expect(track.outputNode).not.toBeNull();
  });

  it ('defer audio initialization if context is not ready', async () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    expect(track.fwdAudio.context).toBeUndefined();

    fwdAudio.start();
    expect(fwdAudio.context.createGain).toHaveBeenCalledTimes(4);
    expect(fwdAudio.context.createStereoPanner).toHaveBeenCalledTimes(1);
  });

  it ('won\'t use audio param setter if not ready', () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = false;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    track['setValueSmoothed'] = jest.fn();

    track.volume = 0;
    track.pan = 0;

    expect(track['setValueSmoothed']).toHaveBeenCalledTimes(0);

  });

  it ('locks audio properties access when torn down', () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = true;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});

    track.tearDown();

    expect(() => track.volume).toThrowError();
    expect(() => track.volume = 0).toThrowError();
    expect(() => track.gain).toThrowError();
    expect(() => track.gain = 0).toThrowError();
    expect(() => track.pan).toThrowError();
    expect(() => track.pan = 0).toThrowError();
    expect(() => track.mute()).toThrowError();
    expect(() => track.unmute()).toThrowError();
    expect(() => track.solo()).toThrowError();
    expect(() => track.unsolo()).toThrowError();
    expect(() => track.muteForSolo()).toThrowError();
    expect(() => track.unmuteForSolo()).toThrowError();
  });

  it ('allow audio properties access when ready', () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = true;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    track['setValueSmoothed'] = jest.fn();

    expect(track.audioIsReady).toBeTruthy();

    expect(() => track.volume).not.toThrowError();
    expect(() => track.gain).not.toThrowError();
    expect(() => track.pan).not.toThrowError();

    expect(track['setValueSmoothed']).toHaveBeenCalledTimes(0);

    expect(() => track.volume = 0).not.toThrowError();
    expect(() => track.gain = 0).not.toThrowError();
    expect(() => track.pan = 0).not.toThrowError();
    expect(() => track.mute()).not.toThrowError();
    expect(() => track.unmute()).not.toThrowError();
    expect(() => track.muteForSolo()).not.toThrowError();
    expect(() => track.unmuteForSolo()).not.toThrowError();
    expect(track['setValueSmoothed']).toHaveBeenCalledTimes(7);

    expect(() => track.solo()).not.toThrowError();
    expect(() => track.unsolo()).not.toThrowError();
    expect(track['setValueSmoothed']).toHaveBeenCalledTimes(7);
  });

  it ('cannot be torn down more than once', () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = true;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});

    track.tearDown();
    expect(() => track.tearDown()).toThrowError();
  });

  it ('cannot be torn down if not initialized', () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = false;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});

    expect(() => track.tearDown()).toThrowError();
    expect(track.wasTornDown).toBeFalsy();
  });

  it ('can be muted and unmuted when context is ready', async () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = true;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    track.mute();
    expect(track.isMute).toBeTruthy();
    track.unmute();
    expect(track.isMute).toBeFalsy();
  });

  it ('can be muted before audio context initialization', async () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: true, pan: 0});
    track.mute = jest.fn();
    expect(track.isMute).toBeTruthy();
    expect(track.mute).toHaveBeenCalledTimes(0);

    fwdAudio.start();
    expect(track.isMute).toBeTruthy();
    expect(track.mute).toHaveBeenCalledTimes(1);
  });

  it ('can be muted and unmuted when context is not ready', async () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = false;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    track.mute();
    expect(track.isMute).toBeTruthy();
    track.unmute();
    expect(track.isMute).toBeFalsy();
  });

  it ('rebuilds audio graph when re-started', async () => {
    const fwdAudio = mockFwdAudio();
    const audioContext = mockAudioContext();
    // @ts-ignore
    fwdAudio['isContextReady'] = true;
    // @ts-ignore
    fwdAudio['context'] = audioContext;

    const track = new FwdAudioTrack(fwdAudio, 'track', {gain: 1, mute: false, pan: 0});
    track.fwdAudio.listeners.forEach((l) => l.audioContextStarted(audioContext));

    expect(track['_muteForSoloGainNode'].disconnect).toHaveBeenCalled();
    expect(track['_muteGainNode'].disconnect).toHaveBeenCalled();
    expect(track['_panNode'].disconnect).toHaveBeenCalled();
    expect(track['_postGainNode'].disconnect).toHaveBeenCalled();
    expect(audioContext.createGain).toHaveBeenCalledTimes(6);
    expect(audioContext.createStereoPanner).toHaveBeenCalledTimes(2);
  });

  it ('notifies listeners when an audio property changes', () => {
    const fwdAudio = new FwdAudioImpl();
    fwdAudio.initializeModule(mockFwd());
    fwdAudio.start();

    const track = fwdAudio.addTrack('track', {gain: 1, mute: false, pan: 0});

    const listener = {
      onTrackVolumeChange: jest.fn(),
      onTrackPanChange: jest.fn(),
      onTrackUnsolo: jest.fn(),
      onTrackUnmute: jest.fn(),
      onTrackSolo: jest.fn(),
      onTrackMute: jest.fn(),
    };

    track.listeners.push(listener);

    track.volume = 0;
    expect(listener.onTrackVolumeChange).toHaveBeenCalledTimes(1);
    track.gain = 1;
    expect(listener.onTrackVolumeChange).toHaveBeenCalledTimes(2);
    track.pan = 0;
    expect(listener.onTrackPanChange).toHaveBeenCalledTimes(1);
    track.mute();
    expect(listener.onTrackMute).toHaveBeenCalledTimes(1);
    track.unmute();
    expect(listener.onTrackUnmute).toHaveBeenCalledTimes(1);
    track.solo();
    expect(listener.onTrackSolo).toHaveBeenCalledTimes(1);
    track.unsolo();
    expect(listener.onTrackUnsolo).toHaveBeenCalledTimes(1);
  });
});
