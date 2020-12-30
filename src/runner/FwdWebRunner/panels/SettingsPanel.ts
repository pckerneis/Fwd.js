import FwdRunner from '../../FwdRunner';
import { PropertyPanel } from './PropertyPanel';

export class SettingsPanel extends PropertyPanel {
  public readonly htmlElement: HTMLDivElement;

  constructor(private readonly runner: FwdRunner) {
    super();

    this.addTitle('Appearance');

    this.addLabel('Theme');
    this.addThemeSelector();

    this.addLabel('Font size');
    const fontSizeInput = this.addNumberInput(14);

    fontSizeInput.oninput = () => {
      document.documentElement.style.fontSize = fontSizeInput.value + 'px';
    };
  }

  private addThemeSelector(): void {
    const themeSelect = document.createElement('select');

    themeSelect.innerHTML = `
      <option value="default">Default</option>
      <option value="dark">Dark</option>
    `;

    themeSelect.oninput = () => {
      const darkMode = themeSelect.selectedIndex === 1;
      this.runner.setDarkMode(darkMode);
    };

    this.htmlElement.append(themeSelect);

    if (this.runner.isDarkMode()) {
      themeSelect.value = 'dark';
    }
  }

  private addYesNoSelector(defaultValue: boolean, changeHandler: Function): void {
    const select = document.createElement('select');

    select.innerHTML = `
      <option value="yes">Yes</option>
      <option value="no">No</option>
    `;

    select.value = defaultValue ? 'yes' : 'no';

    select.oninput = () => {
      changeHandler(select.selectedIndex === 0);
    };

    this.htmlElement.append(select);
  }
}
