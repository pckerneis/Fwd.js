import { injectStyle } from '../../../../runner/FwdWebRunner/StyleInjector';
import { darkTheme, defaultTheme } from '../../../../runner/style.constants';
import { EditorElement } from '../EditorElement';

export class TabbedPanel implements EditorElement {
  public readonly htmlElement: HTMLDivElement;
  public readonly _buttonsContainer: HTMLDivElement;
  public readonly _viewport: HTMLDivElement;

  private readonly _tabItems: TabItem[] = [];
  private _currentTab: TabItem;
  private _elementToShowWhenEmpty: HTMLElement;

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

  public setCurrentTab(tabId: number | null): void {
    if (tabId == null) {
      this._viewport.innerHTML = '';
      this._viewport.append(this._elementToShowWhenEmpty);
      return;
    }

    const tab = this.findTabOrThrow(tabId);

    if (tab.tabOptions.tabContent.htmlElement == null) {
      throw new Error('No element set for tab ' + tabId);
    }

    this._viewport.innerHTML = '';
    this._viewport.append(tab.tabOptions.tabContent.htmlElement);

    this._tabItems.forEach(tab => tab.button.htmlElement.classList.remove('current-tab'));
    tab.button.htmlElement.classList.add('current-tab');
    
    this._currentTab = tab;
  }

  public renameTab(tabId: any, label: string): void {
    const tab = this.findTabOrThrow(tabId);
    tab.tabOptions.tabName = label;
    tab.button.refresh();
  }

  public removeTab(tabId: number): void {
    if (this.isCurrentTab(tabId)) {
      const currentTabIndex = this._tabItems.indexOf(this._currentTab);
      const nextTab = this._tabItems[currentTabIndex + 1];
      const previous = this._tabItems[currentTabIndex - 1];
      this.setCurrentTab(nextTab?.tabOptions.id
        || previous?.tabOptions.id
        || null);
    }

    const tab = this.findTabOrThrow(tabId);
    tab.button.htmlElement.remove();
    tab.tabOptions.tabContent.htmlElement?.remove();
    this._tabItems.splice(this._tabItems.indexOf(tab), 1);
  }

  public findTab(tabId: number): TabItem | undefined {
    return this._tabItems.find((tab) => tabId === tab.tabOptions.id);
  }

  public hasTab(id: number): boolean {
    return !! this.findTab(id);
  }
  
  public setElementToShowWhenEmpty(elementToShowWhenEmpty: HTMLElement): void {
    this._elementToShowWhenEmpty = elementToShowWhenEmpty;
    if (this._currentTab == null) {
      this.setCurrentTab(null);
    }
  }

  private findTabOrThrow(tabId: number): TabItem {
    const tabs = this._tabItems.filter((tab) => tabId === tab.tabOptions.id);

    if (tabs.length === 0) {
      throw new Error('Cannot find tab with id ' + tabId);
    }

    return tabs[0];
  }

  private isCurrentTab(tabId: number): Boolean {
    return this._currentTab.tabOptions.id === tabId;
  }
}

interface TabItemOptions {
  readonly id: number;
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
  private readonly label: HTMLElement;

  constructor(public readonly tabbedPanel: TabbedPanel,
              public readonly tabOptions: TabItemOptions,
              public readonly closeable: boolean) {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-tabbed-panel-button');

    this.label = document.createElement('label');
    this.htmlElement.append(this.label);

    this.htmlElement.onclick = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.tabbedPanel.setCurrentTab(tabOptions.id);
    };

    const closeButton = document.createElement('div');
    closeButton.innerText = '✕';
    this.htmlElement.append(closeButton);
    closeButton.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.tabbedPanel.removeTab(tabOptions.id);
    };
  }

  public refresh(): void {
    this.label.innerText = this.tabOptions.tabName;
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
  display: flex;
  align-items: center;
}

.fwd-tabbed-panel-button>label {
  flex-grow: 1;
  font-size: smaller;
}

.fwd-tabbed-panel-button>div {
  cursor: pointer;
  opacity: 0.6;
  margin-left: 6px;
  font-size: 11px;
}

.fwd-tabbed-panel-button>div:hover {
  opacity: 1;
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
