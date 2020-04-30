import { FwdAudioTrack } from "../../../../../src/fwd/audio/nodes/FwdAudioTrack";
import { MixerTrack } from "../../../../../src/fwd/runner/FwdWebRunner/components/MixerTrack";
import { mockFwdAudio } from "../../../../mocks/FwdAudio.mock";

describe('MixerTrack', () => {
  it('can be created', () => {
    const mixerTrack = new MixerTrack(new FwdAudioTrack(mockFwdAudio(), 'track', {
      gain: 0,
      mute: true,
      pan: 0,
    }));

    expect(mixerTrack).toBeTruthy();
  });
});
