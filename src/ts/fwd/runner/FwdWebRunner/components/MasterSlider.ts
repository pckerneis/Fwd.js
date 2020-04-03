import { injectStyle } from '../StyleInjector';
import { AudioMeter } from './AudioMeter';

export class MasterSlider {
  public readonly htmlElement: HTMLDivElement;
  public readonly meter: AudioMeter;
  public readonly slider: HTMLInputElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('master-section', 'flex-row');

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = '77';
    input.classList.add('master-slider');
    input.id = 'master-slider';
    this.slider = input;

    const label = document.createElement('label') as HTMLLabelElement;
    label.innerText = 'Master';
    label.classList.add('flex-column', 'master-label');
    label.htmlFor = 'master-slider';

    this.meter = new AudioMeter();
    const meterContainer = document.createElement('div');
    meterContainer.classList.add('master-meter');
    meterContainer.append(this.meter.htmlElement);

    this.htmlElement.append(label, input, meterContainer);    
  }
}

injectStyle('MasterSlider', `
.master-section {
  margin-left: auto;
  margin-bottom: 4px;
  margin-top: 4px;
  padding: 4px 0;
}

#master-slider {
  width: 100px;
  margin: 0 12px;
}

.master-meter {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.master-meter meter {
  width: 50px;
}

.master-label {
  justify-content: center;
}
`);