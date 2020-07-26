import { AudioMeterElement } from '../../../../src/api/editor/elements/AudioMeter/AudioMeter';

describe('AudioMeter', () => {
  it('can be created', () => {
    const audioMeter = new AudioMeterElement();
    expect(audioMeter).toBeTruthy();
  });
});
