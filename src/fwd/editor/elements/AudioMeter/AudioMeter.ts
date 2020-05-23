import { injectStyle } from '../../../runner/FwdWebRunner/StyleInjector';
import { gainToDecibels } from '../../../utils/decibels';
import debounce from '../../../utils/time-filters/debounce';
import { EditorElement } from "../../Editor";

export class AudioMeterElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  private readonly _averageMeter: HTMLMeterElement;

  private _releaseClipDebounced: any;

  private _analyser: AnalyserNode;

  private _isMute: boolean = false;

  private _sampleBuffer: Float32Array;

  constructor() {
    this.htmlElement = document.createElement('div');

    const createMeter = () => {
      const meter = document.createElement('meter');
      meter.min = -100;
      meter.max = 10;
      meter.value = -100;
      return meter;
    };

    this._averageMeter = createMeter();

    this.htmlElement.append(this._averageMeter);
    this.update();
  }

  public set audioSource(source: AudioNode) {
    if (this._analyser != null) {
      this._analyser.disconnect();
    }

    this._analyser = source.context.createAnalyser();
    this._analyser.fftSize = 2048;
    source.connect(this._analyser);
  }

  public get mute(): boolean {
    return this._isMute;
  }

  public set mute(shouldBeMute: boolean) {
    this._isMute = shouldBeMute;

    if (this._isMute) {
      this.htmlElement.classList.add('mute');
    } else {
      this.htmlElement.classList.remove('mute');
    }
  }

  private update(): void {
    if (this._analyser == null) {
      setTimeout(() => this.update(), 200);
      return;
    }

    if (this._sampleBuffer == null) {
      this._sampleBuffer = new Float32Array(this._analyser.fftSize);
    }

    this._analyser.getFloatTimeDomainData(this._sampleBuffer);

    let clipping = false;

    // Compute average
    let sumOfSquares = 0;

    for (let i = 0; i < this._sampleBuffer.length; i++) {
      sumOfSquares += this._sampleBuffer[i] ** 2;
      clipping = clipping || this._sampleBuffer[i] > 1;
    }

    const average = gainToDecibels(sumOfSquares / this._sampleBuffer.length);
    this._averageMeter.value = isFinite(average) ? average : this._averageMeter.min;

    if (clipping) {
      this.blink();
    }

    requestAnimationFrame(() => this.update());
  }

  private blink(): void {
    const releaseTime = 300;
    const cssClass = 'clipping';

    this.htmlElement.classList.add(cssClass);

    if (this._releaseClipDebounced == null) {
      this._releaseClipDebounced = debounce(() => {
        this.htmlElement.classList.remove(cssClass);
      }, releaseTime);
    }

    this._releaseClipDebounced();
  }
}

injectStyle('AudioMeter', `
meter {
  display: block;
  margin: auto;
  height: 13px;
}

meter::-webkit-meter-bar {
  background: none; /* Important to get rid of default background. */
  background-color: whiteSmoke;
  box-shadow: 0 5px 5px -5px #333 inset;
}

meter::-webkit-meter-optimum-value {
  box-shadow: 0 5px 5px -5px #999 inset;
  background-image: linear-gradient(90deg, #69b2cf 0%, #f28f68 100%);
  background-size: 100% 100%;
}

.clipping meter::-webkit-meter-optimum-value {
  background-image: linear-gradient(90deg, #dd4620 0%, #dd1515 100%);
}

.mute meter::-webkit-meter-optimum-value {
  background-image: linear-gradient(90deg, #878787 0%, #adadad 100%);
}
`);
