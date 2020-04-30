import { FwdAudioTrack } from "../../../../../src/fwd/audio/nodes/FwdAudioTrack";
import { MixerSection } from "../../../../../src/fwd/runner/FwdWebRunner/components/MixerSection";
import { Logger, LoggerLevel } from "../../../../../src/fwd/utils/dbg";
import { mockFwdAudio } from "../../../../mocks/FwdAudio.mock";

Logger.runtimeLevel = LoggerLevel.none;

describe('MixerSection', () => {
  it('can be created', () => {
    const mixerSection = new MixerSection();
    expect(mixerSection).toBeTruthy();
  });

  it('can add and remove tracks', () => {
    const mixerSection = new MixerSection();
    const audioTrack1 = new FwdAudioTrack(mockFwdAudio(), 'track1', {pan: 0, gain: 0, mute: false});
    const audioTrack2 = new FwdAudioTrack(mockFwdAudio(), 'track2', {pan: 0, gain: 0, mute: false});

    expect(mixerSection.mixerTracks.length).toBe(0);

    mixerSection.addTrack(audioTrack1);
    mixerSection.addTrack(audioTrack2);
    expect(mixerSection.mixerTracks.length).toBe(2);

    mixerSection.removeTrack(audioTrack1);
    expect(mixerSection.mixerTracks.length).toBe(1);

    mixerSection.clearTracks();
    expect(mixerSection.mixerTracks.length).toBe(0);
  });

  it('cannot remove a track that wasn\'t added', () => {
    const mixerSection = new MixerSection();
    const audioTrack1 = new FwdAudioTrack(mockFwdAudio(), 'track1', {pan: 0, gain: 0, mute: false});

    expect(() => mixerSection.removeTrack(audioTrack1)).not.toThrow();
  });
});
