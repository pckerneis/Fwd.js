import { FwdAudio } from "../../src/fwd/audio/FwdAudio";
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
