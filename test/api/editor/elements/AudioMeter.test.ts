import "web-audio-test-api";

import { AudioMeterElement } from '../../../../src/fwd/editor/elements/AudioMeter/AudioMeter';

describe('AudioMeterElement', () => {
  it('should create an AudioMeterElement', () => {
    const audioMeter = new AudioMeterElement();
    expect(audioMeter).toBeTruthy();
  });

  it('should set the analyser source', () => {
    const nativeContext = new AudioContext();

    const audioMeter = new AudioMeterElement();
    expect(audioMeter['_analyser']).toBeUndefined();
    audioMeter.audioSource = nativeContext.createGain();
    expect(audioMeter.audioSource).toBeTruthy();
    expect(audioMeter['_analyser']).toBeTruthy();
    audioMeter.audioSource = nativeContext.createOscillator();
    expect(() => audioMeter.audioSource = null).not.toThrowError();
    expect(audioMeter.audioSource).toBeNull();
    expect(audioMeter['_analyser']).toBeNull();
  });

  it('should blink when audio is clipping', async (done) => {
    const nativeContext = new AudioContext();
    const gain = nativeContext.createGain();
    const audioMeter = new AudioMeterElement();
    audioMeter.audioSource = gain;

    audioMeter['_analyser'].getFloatTimeDomainData = jest.fn().mockImplementation((array) => {
      array.fill(10);
    });

    setTimeout(() => {
      expect(audioMeter.htmlElement.classList.contains('clipping')).toBeTruthy();

      audioMeter['_analyser'].getFloatTimeDomainData = jest.fn().mockImplementation((array) => {
        array.fill(0);
      })

      setTimeout(() => {
        expect(audioMeter.htmlElement.classList.contains('clipping')).toBeFalsy();
        done();
      }, 600);
    }, 500);
  });

  it('should mute', () => {
    const audioMeter = new AudioMeterElement();
    expect(audioMeter.mute).toBeFalsy();
    expect(audioMeter.htmlElement.classList.contains('mute')).toBeFalsy();
    audioMeter.mute = true;
    expect(audioMeter.mute).toBeTruthy();
    expect(audioMeter.htmlElement.classList.contains('mute')).toBeTruthy();
    audioMeter.mute = false;
    expect(audioMeter.mute).toBeFalsy();
    expect(audioMeter.htmlElement.classList.contains('mute')).toBeFalsy();
  });
});
