import { gainToDecibels } from '../../../core/utils/decibels';
import debounce from '../../../utils/debounce';

export class AudioMeter {
  public readonly htmlElement: HTMLElement;

  private _averageMeter: HTMLMeterElement;

  private _releaseClipDebounced: any;

  public set audioSource(source: GainNode) {
    if (this._analyser != null) {
      this._analyser.disconnect();
    }

    this._analyser = source.context.createAnalyser();
    this._analyser.fftSize = 2048;
    source.connect(this._analyser);
  }

  private _analyser: AnalyserNode;

  constructor() {
    this.htmlElement = document.createElement('div');
    
    const createMeter = () => {
      const meter = document.createElement('meter');
      meter.min = -100;
      meter.max = 10;
      meter.value = -100;
      return meter;
    }

    this._averageMeter = createMeter();
    
    this.htmlElement.append(this._averageMeter);
    this.update();
  }

  private update() {
    if (this._analyser == null) {
      setTimeout(() => this.update(), 200);
      return;
    }

    const sampleBuffer = new Float32Array(this._analyser.fftSize);
    this._analyser.getFloatTimeDomainData(sampleBuffer);

    let clipping = false;

    // Compute average
    let sumOfSquares = 0;
        
    for (let i = 0; i < sampleBuffer.length; i++) {
      sumOfSquares += sampleBuffer[i] ** 2;
      clipping = clipping || sampleBuffer[i] > 1;
    }

    const average = gainToDecibels(sumOfSquares / sampleBuffer.length);
    this._averageMeter.value = isFinite(average) ? average : this._averageMeter.min;

    if (clipping) {
      this.clip();
    }

    requestAnimationFrame(() => this.update());
  }

  private clip() {
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