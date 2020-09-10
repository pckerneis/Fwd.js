import { injectStyle } from '../../../../runner/FwdWebRunner/StyleInjector';
import { darkTheme, defaultTheme } from '../../../../runner/style.constants';
import { EditorElement } from '../EditorElement';

export class TabbedPanel implements EditorElement {
  public readonly htmlElement: HTMLDivElement;
  public readonly _buttonsContainer: HTMLDivElement;
  public readonly _viewport: HTMLDivElement;

  private readonly _tabItems: TabItem[] = [];

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-tabbed-panel');

    this._buttonsContainer = document.createElement('div');
    this._buttonsContainer.classList.add('fwd-tabbed-panel-buttons');

    this._viewport = document.createElement('div');
    this._viewport.classList.add('fwd-tabbed-panel-viewport');

    this.htmlElement.append(this._buttonsContainer, this._viewport);
  }

  public addTab(tabOptions: TabItemOptions): void {
    const button = new TabButtonElement(this, tabOptions.tabName, tabOptions.closeable);
    this._buttonsContainer.append(button.htmlElement);

    this._tabItems.push({
      tabOptions,
      button,
    });

    if (this._viewport.innerHTML === '') {
      this.setCurrentTab(tabOptions.tabName);
    }
  }

  public setCurrentTab(tabName: string): void {
    const tabs = this._tabItems.filter((tab) => tabName === tab.tabOptions.tabName);

    if (tabs.length === 0) {
      throw new Error('Cannot find tab with name ' + tabName);
    }

    const tab = tabs[0];

    this._viewport.innerHTML = '';
    this._viewport.append(tab.tabOptions.tabContent.htmlElement);

    this._tabItems.forEach(tab => tab.button.htmlElement.classList.remove('current-tab'));
    tab.button.htmlElement.classList.add('current-tab');
  }
}

interface TabItemOptions {
  tabName: string;
  tabContent: EditorElement;
  closeable: boolean;
}

interface TabItem {
  tabOptions: TabItemOptions;
  button: TabButtonElement;
}

export class TabButtonElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  constructor(public readonly tabbedPanel: TabbedPanel,
              public readonly tabName: string,
              public readonly closeable: boolean) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-tabbed-panel-button');
    this.htmlElement.innerText = tabName;

    this.htmlElement.onclick = (evt) => {
      this.tabbedPanel.setCurrentTab(this.tabName);
      evt.preventDefault();
    }
  }
}

injectStyle('TabbedPanel', `
.fwd-tabbed-panel {
  display: flex;
  flex-direction: column;
}

.fwd-tabbed-panel-buttons {
  display: flex;
  flex-wrap: nowrap;
  overflow: auto;
}

.fwd-tabbed-panel-button {
  border-bottom: 1px solid ${defaultTheme.bgPrimary};
  border-right: 1px solid ${defaultTheme.bgPrimary};
  background: ${defaultTheme.bgSecondary};
  padding: 2px 5px;
  cursor: pointer;
  user-select: none;
  font-size: smaller;
}

.fwd-tabbed-panel-button.current-tab {
  border-bottom: none;
  font-weight: bold;
}

.fwd-tabbed-panel-button:not(.current-tab) {
  filter: brightness(80%);
}

.fwd-tabbed-panel-button:hover {
  filter: invert(7%);
}

.fwd-runner-dark-mode .fwd-tabbed-panel-button {
  background: ${darkTheme.bgSecondary};
  border-color: ${darkTheme.bgPrimary};
}
.fwd-tabbed-panel-viewport {
  flex-grow: 1;
  overflow: auto;
  display: flex;
  width: 100%;
}
`);