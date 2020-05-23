import { ToggleButton } from "../../../runner/FwdWebRunner/components/ToggleButton";
import { VerticalSlider } from "../../../runner/FwdWebRunner/components/VerticalSlider";
import { injectStyle } from "../../../runner/FwdWebRunner/StyleInjector";
import { Logger } from "../../../utils/Logger";
import { clamp, parseNumber } from "../../../utils/numbers";
import audit from "../../../utils/time-filters/audit";
import { EditorElement } from "../../Editor";
import { AudioMeterElement } from "../AudioMeter/AudioMeter";
import parentLogger from "../logger.components";
import { AbstractSoloGroupItem } from "./FwdSoloGroup";

const DBG = new Logger('AudioTrackElement', parentLogger);

export class AudioTrackElement implements EditorElement {
  public readonly htmlElement: HTMLDivElement;
  public readonly trackGraph: AudioMixerTrackGraph;

  public readonly gainSlider: VerticalSlider;
  public readonly panSlider: HTMLInputElement;
  public readonly muteButton: ToggleButton;
  public readonly soloButton: ToggleButton;
  public readonly audioMeter: AudioMeterElement;

  constructor(audioContext: AudioContext, public readonly trackName: string) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('mixer-track');

    this.panSlider = AudioTrackElement.createRangeInput(0, -1, 1, 0.001);
    this.panSlider.classList.add('slider', 'mixer-track-pan-slider');

    this.gainSlider = new VerticalSlider();
    this.gainSlider.htmlElement.classList.add('mixer-track-volume-slider');

    this.muteButton = new ToggleButton('M');
    this.muteButton.htmlElement.classList.add('mixer-track-mute-button');

    this.trackGraph = new AudioMixerTrackGraph(audioContext, this);

    this.muteButton.oninput = () => {
      if (this.muteButton.toggled) {
        this.trackGraph.mute();
        this.onTrackMute();
      } else {
        this.trackGraph.unmute();
        this.onTrackUnmute();
      }
    };

    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('mixer-track-buttons');

    this.soloButton = new ToggleButton('S');
    this.soloButton.htmlElement.classList.add('mixer-track-solo-button');
    this.soloButton.htmlElement.onclick = (event) => {
      if (! this.soloButton.toggled) {
        DBG.debug('soloing ' + trackName);
        this.trackGraph.solo(! event.ctrlKey);
      } else {
        this.trackGraph.unsolo();
      }
    };

    buttonDiv.append(
      this.soloButton.htmlElement,
      this.muteButton.htmlElement,
    );

    this.audioMeter = new AudioMeterElement();
    this.audioMeter.audioSource = this.trackGraph.gainNode;

    this.htmlElement.append(
      this.panSlider,
      this.gainSlider.htmlElement,
      buttonDiv,
      this.audioMeter.htmlElement,
    );

    // Bindings
    const auditSetGain = audit((value: number) => {
      this.trackGraph.setGain(value);
    });

    this.gainSlider.oninput = (value: number) => {
      auditSetGain(value);
    };

    const auditSetPan = audit(() => {
      this.trackGraph.setPan(parseNumber(this.panSlider.value));
    });

    this.panSlider.oninput = (/* event */) => {
      auditSetPan();
    };
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

  public onSoloChange(isSoloed: boolean): void {
    this.soloButton.setToggled(isSoloed, false);
  }

  private onTrackMute(): void {
    this.muteButton.setToggled(true, false);
    this.audioMeter.mute = true;
  }

  private onTrackUnmute(): void {
    this.muteButton.setToggled(false, false);
    this.audioMeter.mute = false;
  }
}

const TRACK_WIDTH = 60;

injectStyle('AudioTrackElement', `
.mixer-track {
  width: ${TRACK_WIDTH}px;
  display: flex;
  flex-direction: column;
  padding: 3px;
  border: 1px solid #00000010;
  box-sizing: border-box;
  flex-grow: 1;
}

.mixer-track-pan-slider {
  width: 100%;
  max-height: 20px;
  margin: auto;
}

.mixer-track-volume-slider {
  width: 100%;
  flex-grow: 1;
}

.mixer-track-solo-button,
.mixer-track-mute-button {
  width: 20px;
  max-height: 20px;
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

.mixer-track meter {
  width: 80%;
  margin: auto;
}
`);

export class AudioMixerTrackGraph extends AbstractSoloGroupItem {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;
  public readonly muteNode: GainNode;
  public readonly gainNode: GainNode;
  public readonly stereoPannerNode: StereoPannerNode;

  constructor(public readonly audioContext: AudioContext, private readonly audioMixerTrack: AudioTrackElement) {
    super(audioContext);

    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();
    this.muteNode = audioContext.createGain();
    this.gainNode = audioContext.createGain();
    this.stereoPannerNode = audioContext.createStereoPanner();

    this.inputNode.gain.value = 1;
    this.outputNode.gain.value = 1;
    this.muteNode.gain.value = 1;

    this.inputNode
      .connect(this.stereoPannerNode)
      .connect(this.gainNode)
      .connect(this.muteNode)
      .connect(this.soloGainNode)
      .connect(this.outputNode);
  }

  public get soloGainNode(): GainNode {
    return this._soloGainNode;
  }

  public mute(): void {
    this.muteNode.gain.value = 0;
  }

  public unmute(): void {
    this.muteNode.gain.value = 1;
  }

  public setPan(value: number): void {
    this.stereoPannerNode.pan.value = clamp(value, -1, 1);
  }

  public setGain(value: number): void {
    this.gainNode.gain.value = clamp(value, 0, 1);
  }

  public onSoloChange(isSoloed: boolean): void {
    this.audioMixerTrack.onSoloChange(isSoloed);
  }
}
