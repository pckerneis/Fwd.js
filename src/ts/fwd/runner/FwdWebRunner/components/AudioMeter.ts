import { gainToDecibels } from '../../../core/utils/decibels';

export class AudioMeter {
  public readonly htmlElement: HTMLElement;

  private _averageMeter: HTMLMeterElement;

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

    // Compute average
    let sumOfSquares = 0;
    
    for (let i = 0; i < sampleBuffer.length; i++) {
      sumOfSquares += sampleBuffer[i] ** 2;
    }

    const average = AudioMeter.dB(sumOfSquares / sampleBuffer.length);
    this._averageMeter.value = isFinite(average) ? average : this._averageMeter.min;

    requestAnimationFrame(() => this.update());
  }

  private static dB(value: number) {
    return gainToDecibels(value);
  }
}