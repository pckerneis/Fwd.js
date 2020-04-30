import { AudioMeter } from "../../../../../src/fwd/runner/FwdWebRunner/components/AudioMeter";

describe('AudioMeter', () => {
  it('can be created', () => {
    const audioMeter = new AudioMeter();
    expect(audioMeter).toBeTruthy();
  });
});
