import { FwdAudioImpl } from "../../../../../src/fwd/audio/FwdAudioImpl";
import { FwdAudioTrack, FwdAudioTrackListener } from "../../../../../src/fwd/audio/nodes/FwdAudioTrack";
import { MixerTrack } from "../../../../../src/fwd/runner/FwdWebRunner/components/MixerTrack";
import { mockFwdAudio } from "../../../../mocks/FwdAudio.mock";
import { mockAudioContext, mockAudioNode } from "../../../../mocks/WebAudio.mock";

describe('MixerTrack', () => {
  it('can be created', () => {
    const mixerTrack = new MixerTrack(new FwdAudioTrack(mockFwdAudio(), 'track', {
      gain: 0,
      mute: true,
      pan: 0,
    }));

    expect(mixerTrack).toBeTruthy();
  });

  it('toggles audio track mute when mute button is clicked', () => {
    const mixerTrack = new MixerTrack(jest.fn().mockImplementation(() => {
      return {
        mute: jest.fn(),
        unmute: jest.fn(),
        listeners: [],
        pan: 0,
      }
    })());

    mixerTrack.muteButton.htmlElement.click();
    expect(mixerTrack.audioTrack.mute).toHaveBeenCalledTimes(1);

    mixerTrack.muteButton.htmlElement.click();
    expect(mixerTrack.audioTrack.unmute).toHaveBeenCalledTimes(1);
  });

  it('toggles audio track mute when mute button is clicked', () => {
    const fwdAudio = mockFwdAudio();

    const mixerTrack = new MixerTrack(jest.fn().mockImplementation(() => {
      return {
        mute: jest.fn(),
        unmute: jest.fn(),
        solo: jest.fn(),
        unsolo: jest.fn(),
        listeners: [],
        pan: 0,
        fwdAudio,
      }
    })());

    mixerTrack.soloButton.htmlElement.click();
    expect(mixerTrack.audioTrack.solo).toHaveBeenCalledTimes(1);

    mixerTrack.soloButton.htmlElement.click();
    expect(mixerTrack.audioTrack.unsolo).toHaveBeenCalledTimes(1);
  });

  it('sets audio track gain when gain slider is moved', () => {
    jest.useFakeTimers();

    const mixerTrack = new MixerTrack(jest.fn().mockImplementation(() => {
      return {
        listeners: [],
        gain: 42,
        pan: 12,
      }
    })());

    mixerTrack.gainSlider.oninput(3);
    jest.runOnlyPendingTimers();

    expect(mixerTrack.audioTrack.gain).toBe(3);
  });

  it('sets audio track gain when gain slider is moved', () => {
    jest.useFakeTimers();

    const mixerTrack = new MixerTrack(jest.fn().mockImplementation(() => {
      return {
        listeners: [],
        pan: 42,
      }
    })());

    mixerTrack.panSlider.value = '12';

    mixerTrack.panSlider.oninput({} as Event);
    jest.runOnlyPendingTimers();
    expect(mixerTrack.audioTrack.pan).toBe(12);
  });

  it('receives audio track events', () => {
    const audioTrack = jest.fn().mockImplementation(() => {
      return {
        listeners: [],
        pan: 42,
        gain: 12,
        meteringNode: mockAudioNode(),
        fwdAudio: new FwdAudioImpl(),
      }
    })();

    const mixerTrack = new MixerTrack(audioTrack);

    audioTrack.meteringNode['context'] = mockAudioContext();

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackMute());
    expect(mixerTrack.muteButton.toggled).toBeTruthy();

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackUnmute());
    expect(mixerTrack.muteButton.toggled).toBeFalsy();

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackSolo());
    expect(mixerTrack.soloButton.toggled).toBeTruthy();

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackUnsolo());
    expect(mixerTrack.soloButton.toggled).toBeFalsy();

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackVolumeChange(1));
    expect(mixerTrack.gainSlider.value).toBe(1);

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackPanChange(-1));
    expect(mixerTrack.panSlider.value).toBe('-1');

    audioTrack.listeners.forEach((l: FwdAudioTrackListener) => l.onTrackAudioReady());
    expect(audioTrack.meteringNode.context.createAnalyser).toHaveBeenCalledTimes(1);
  });
});
