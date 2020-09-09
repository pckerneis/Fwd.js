import FwdRunner from '../../FwdRunner';
import { injectStyle } from '../StyleInjector';

export class ExportPanel {
  public readonly htmlElement: HTMLDivElement;

  constructor(private readonly runner: FwdRunner) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-export-panel');
    this.htmlElement.style.display = 'flex';
    this.htmlElement.style.flexDirection = 'column';

    const renderAudioTitle = document.createElement('h3');
    renderAudioTitle.innerText = 'Render audio offline';

    const durationLabel = document.createElement('b');
    durationLabel.innerText = 'Duration (seconds) :';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.value = '30';

    const srLabel = document.createElement('b');
    srLabel.innerText = 'Sample rate :';
    const srInput = document.createElement('input');
    srInput.type = 'number';
    srInput.value = '44100';

    const fileNameLabel = document.createElement('b');
    fileNameLabel.innerText = 'File name :';
    const fileNameInput = document.createElement('input');
    fileNameInput.value = 'audio.wav';

    const renderButton = document.createElement('button');
    renderButton.innerText = 'Render';
    renderButton.onclick = () => {
      this.runner.render(parseFloat(durationInput.value), parseFloat(srInput.value), fileNameInput.value);
    };

    this.htmlElement.append(
      fileNameLabel,
      fileNameInput,
      renderAudioTitle,
      durationLabel,
      durationInput,
      srLabel,
      srInput,
      renderButton);
  }
}

injectStyle('ExportPanel', `
.fwd-export-panel {
  padding: 8px;
  background: #f8f8f8;
  border-left: 1px solid #e0e0e0;
}

.fwd-export-panel * {
  display: block;
  margin-top: 4px;
}
`);
