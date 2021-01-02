import { injectStyle } from '../../../../runner/FwdWebRunner/StyleInjector';
import { darkTheme, defaultTheme } from '../../../../runner/style.constants';
import { EditorElement } from '../EditorElement';

export class TabbedPanel implements EditorElement {
  public readonly htmlElement: HTMLDivElement;
  public readonly _buttonsContainer: HTMLDivElement;
  public readonly _viewport: HTMLDivElement;

  private readonly _tabItems: TabItem[] = [];
  private _currentTab: TabItem;

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
    if (this._tabItems.map(item => item.tabOptions.id).includes(tabOptions.id)) {
      throw new Error('Cannot add tab with same ID');
    }

    const button = new TabButtonElement(this, tabOptions, tabOptions.closeable);
    this._buttonsContainer.append(button.htmlElement);

    this._tabItems.push({
      tabOptions,
      button,
    });

    if (this._viewport.innerHTML === '') {
      this.setCurrentTab(tabOptions.id);
    }
  }

  public setCurrentTab(tabId: string | null): void {
    if (tabId == null) {
      // TODO: show default content
      return;
    }

    const tab = this.findTab(tabId);

    this._viewport.innerHTML = '';
    this._viewport.append(tab.tabOptions.tabContent.htmlElement);

    this._tabItems.forEach(tab => tab.button.htmlElement.classList.remove('current-tab'));
    tab.button.htmlElement.classList.add('current-tab');
    
    this._currentTab = tab;
  }

  public renameTab(tabId: any, label: string): void {
    const tab = this.findTab(tabId);
    tab.tabOptions.tabName = label;
    tab.button.refresh();
  }

  public removeTab(tabId: string): void {
    if (this.isCurrentTab(tabId)) {
      // TODO: show next or previous tab when possible
      this.setCurrentTab(null);
    }

    const tab = this.findTab(tabId);
    tab.button.htmlElement.remove();
    tab.tabOptions.tabContent.htmlElement.remove();
    this._tabItems.splice(this._tabItems.indexOf(tab), 1);
  }

  public findTab(tabId: string): TabItem {
    const tabs = this._tabItems.filter((tab) => tabId === tab.tabOptions.id);

    if (tabs.length === 0) {
      throw new Error('Cannot find tab with id ' + tabId);
    }

    return tabs[0];
  }

  private isCurrentTab(tabId: string): Boolean {
    return this._currentTab.tabOptions.id === tabId;
  }
}

interface TabItemOptions {
  readonly id: any;
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
              public readonly tabOptions: TabItemOptions,
              public readonly closeable: boolean) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-tabbed-panel-button');
    this.htmlElement.innerText = tabOptions.tabName;

    this.htmlElement.onclick = (evt) => {
      this.tabbedPanel.setCurrentTab(tabOptions.id);
      evt.preventDefault();
    }
  }

  public refresh(): void {
    this.htmlElement.innerText = this.tabOptions.tabName;
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

.fwd-tabbed-panel-buttons:after {
    content: " ";
    flex-grow: 1;
    border-bottom: 1px solid lightgrey;
}

.fwd-tabbed-panel-button {
  border-bottom: 1px solid ${defaultTheme.bgPrimary};
  border-right: 1px solid lightgrey;
  background: ${defaultTheme.bgPrimary};
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
  filter: brightness(90%);
  border-bottom: 1px solid lightgrey;
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
  position: relative;
}

.fwd-tabbed-panel-viewport > * {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
}
`);
