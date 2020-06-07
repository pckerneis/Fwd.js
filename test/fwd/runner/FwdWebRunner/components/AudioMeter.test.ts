import { AudioMeterElement } from "../../../../../src/client/fwd/editor/elements/AudioMeter/AudioMeter";

describe('AudioMeter', () => {
  it('can be created', () => {
    const audioMeter = new AudioMeterElement();
    expect(audioMeter).toBeTruthy();
  });
});
