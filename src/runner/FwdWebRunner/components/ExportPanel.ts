import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
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
    renderButton.classList.add('text-button');
    renderButton.innerText = 'Render';
    renderButton.onclick = () => {
      this.runner.render(parseFloat(durationInput.value), parseFloat(srInput.value), fileNameInput.value);
    };

    this.htmlElement.append(
      renderAudioTitle,
      fileNameLabel,
      fileNameInput,
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
  background: ${defaultTheme.bgSecondary};
  border-left: 1px solid #e0e0e0;
}

.fwd-runner-dark-mode .fwd-export-panel {
  background: ${darkTheme.bgSecondary};
  border-left: none;
}

.fwd-export-panel * {
  display: block;
  margin-top: 4px;
}

.fwd-runner-dark-mode .text-button {
  background: ${darkTheme.bgPrimary};
  color: ${darkTheme.textColor};
  border: 1px solid ${darkTheme.textColor};
  border-radius: 2px;
}
`);
