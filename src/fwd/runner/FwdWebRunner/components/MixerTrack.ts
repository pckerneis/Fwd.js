import { FwdAudioTrack } from "../../../audio/nodes/FwdAudioTrack";
import { parseNumber } from "../../../core/utils/numbers";
import { injectStyle } from '../StyleInjector';
import { AudioMeter } from "./AudioMeter";
import { TRACK_WIDTH } from "./MixerSection.constants";
import { ToggleButton } from "./ToggleButton";
import { VerticalSlider } from "./VerticalSlider";

export class MixerTrack {
  public readonly htmlElement: HTMLDivElement;

  public readonly gainSlider: VerticalSlider;
  public readonly panSlider: HTMLInputElement;
  public readonly muteButton: ToggleButton;
  public readonly soloButton: ToggleButton;
  public readonly audioMeter: AudioMeter;

  constructor(public readonly audioTrack: FwdAudioTrack) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-track');

    this.panSlider = MixerTrack.createRangeInput(0, -1, 1, 0.001);
    this.panSlider.classList.add('slider', 'mixer-track-pan-slider');

    this.gainSlider = new VerticalSlider();
    this.gainSlider.htmlElement.classList.add('mixer-track-volume-slider');

    this.muteButton = new ToggleButton('M');
    this.muteButton.htmlElement.classList.add('mixer-track-mute-button');

    this.muteButton.oninput = () => {
      if (this.muteButton.toggled) {
        this.audioTrack.mute();
      } else {
        this.audioTrack.unmute();
      }
    };

    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('mixer-track-buttons');

    this.soloButton = new ToggleButton('S');
    this.soloButton.htmlElement.classList.add('mixer-track-solo-button');
    this.soloButton.oninput = () => {
      if (this.soloButton.toggled) {
        this.audioTrack.solo();
      } else {
        this.audioTrack.unsolo();
      }
    };

    buttonDiv.append(
      this.soloButton.htmlElement,
      this.muteButton.htmlElement,
    );

    this.audioMeter = new AudioMeter();

    this.audioTrack.listeners.push({

    });

    this.htmlElement.append(
      this.panSlider,
      this.gainSlider.htmlElement,
      buttonDiv,
      this.audioMeter.htmlElement,
    );

    // Bindings
    this.gainSlider.oninput = (value: number) => {
      this.audioTrack.gain = value;
    };

    this.panSlider.oninput = (/* event */) => {
      this.audioTrack.pan = parseNumber(this.panSlider.value);
    };

    this.audioTrack.listeners.push({
      onTrackMute: () => { this.muteButton.setToggled(true, false); },
      onTrackSolo: () => { this.soloButton.setToggled(true, false); },
      onTrackUnmute: () => { this.muteButton.setToggled(false, false); },
      onTrackUnsolo: () => { this.soloButton.setToggled(false, false); },
      onTrackVolumeChange: (newValue) => { this.gainSlider.setValue(newValue, false); },
      onTrackPanChange: (newValue) => { this.panSlider.value = newValue.toString(); },
      onTrackAudioReady: () => this.audioMeter.audioSource = this.audioTrack.outputNode,
    });

    this.panSlider.value = this.audioTrack.pan.toString();
    this.gainSlider.setValue(this.audioTrack.gain, false);
    this.muteButton.setToggled(this.audioTrack.isMute, false);
  }

  private static createRangeInput(value: number, min: number, max: number, step: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'range';
    input.value = value.toString();
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    return input;
  }
}

injectStyle('MixerTrack', `
.mixer-track {
  width: ${TRACK_WIDTH}px;
  display: flex;
  flex-direction: column;
  padding: 3px;
  border: 1px solid #00000010;
  box-sizing: border-box;
}

.mixer-track-pan-slider {
  width: 100%;
  height: 20px;
  -webkit-appearance: slider-vertical
}

.mixer-track-volume-slider {
  width: 100%;
  flex-grow: 1;
  min-height: 50px;
}

.mixer-track-solo-button,
.mixer-track-mute-button {
  width: 20px;
  height: 20px;
  margin: 3px auto;
}

.mixer-track-solo-button.toggled {
 background: #6ab3ff;
 color: black;
}

.mixer-track-mute-button.toggled {
 background: #ff8d8d;
 color: black;
}

.mixer-track-buttons {
  display: flex;
  margin-top: 5px;
}
`);
