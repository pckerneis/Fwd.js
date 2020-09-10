import FwdRunner from '../../FwdRunner';
import { darkTheme, defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';

export class SettingsPanel {
  public readonly htmlElement: HTMLDivElement;

  constructor(private readonly runner: FwdRunner) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-export-panel');
    this.htmlElement.style.display = 'flex';
    this.htmlElement.style.flexDirection = 'column';

    const appearanceTitle = document.createElement('h3');
    appearanceTitle.innerText = 'Appearance';

    const themeLabel = document.createElement('b');
    themeLabel.innerText = 'Theme :';
    const themeSelect = document.createElement('select');
    themeSelect.innerHTML = `
      <option value="default">Default</option>
      <option value="dark"}>Dark</option>
    `;

    if (this.runner.isDarkMode()) {
      themeSelect.value = 'dark';
    }

    const fontSizeLabel = document.createElement('b');
    fontSizeLabel.innerText = 'Font size :';
    const fontSizeInput = document.createElement('input');
    fontSizeInput.type = 'number';
    fontSizeInput.value = '14';


    this.htmlElement.append(
      appearanceTitle,
      themeLabel,
      themeSelect,
      fontSizeLabel,
      fontSizeInput,
      fontSizeLabel,
      fontSizeInput);

    themeSelect.oninput = () => {
      const darkMode = themeSelect.selectedIndex === 1;
      this.runner.setDarkMode(darkMode);
    }

    fontSizeInput.oninput = () => {
      document.documentElement.style.fontSize = fontSizeInput.value + 'px';
    }
  }
}

injectStyle('ExportPanel', `
.fwd-export-panel {
  padding: 8px;
  background: ${defaultTheme.bgSecondary};
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
