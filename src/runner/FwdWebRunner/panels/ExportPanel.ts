import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';
import { PropertyPanel } from './PropertyPanel';

export class ExportPanel extends PropertyPanel {
  public readonly htmlElement: HTMLDivElement;

  constructor(private readonly runner: FwdRunner) {
    super();

    this.addTitle('Render audio offline');

    this.addLabel('Duration (secs)');
    const durationInput = this.addNumberInput(30, 0);

    this.addLabel('Sample rate');
    const srInput = this.addNumberInput(44100, 3000, 384000);

    this.addLabel('File name');
    const fileNameInput = this.addTextInput('audio.wav');

    this.addTextButton('Render', () => {
      this.runner.render(parseFloat(durationInput.value), parseFloat(srInput.value), fileNameInput.value);
    });
  }
}

injectStyle('ExportPanel', `
.fwd-export-panel {
  padding: 8px;
  background: ${defaultTheme.bgSecondary};
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1.8rem;
}

.fwd-export-panel input {
  width: 100%;
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
