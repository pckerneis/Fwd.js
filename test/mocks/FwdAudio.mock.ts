import { FwdAudio } from "../../src/client/fwd/audio/FwdAudio";
import { mockScheduler } from './Fwd.mock';
import { mockAudioContext } from "./WebAudio.mock";
import Mock = jest.Mock;

export const mockFwdAudio: Mock<FwdAudio> = jest.fn().mockImplementation(() => {
  return {
    listeners: [],
    isContextReady: false,
    master: {},
    tracks: [],
    soloedTrack: null,
    context: mockAudioContext(),
    fwdScheduler: mockScheduler(),

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
