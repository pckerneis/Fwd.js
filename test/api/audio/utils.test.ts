import "web-audio-test-api";
import { bufferToWave, downloadFile, playBack } from '../../../src/fwd/audio/utils';
import { random } from '../../../src/fwd/utils/numbers';

describe('audio/utils', () => {
  beforeEach(() => {
    window.URL.createObjectURL = jest.fn();
    window.URL.revokeObjectURL = jest.fn();
  });

  it('converts an AudioBuffer to a wave blob', () => {
    const buffer = new AudioContext().createBuffer(
      1, 512,44100);

    for (let i = 0; i < buffer.length; ++i) {
      buffer.getChannelData(0)[i] = random(-1, 1);
    }

    const blob = bufferToWave(buffer, 0, 0);

    expect(blob).not.toBeNull();
  });

  it('downloads a blob', () => {
    downloadFile(new Blob(), 'name');
  });

  it('plays an audio blob', () => {
    playBack(new Blob())
  })
});
