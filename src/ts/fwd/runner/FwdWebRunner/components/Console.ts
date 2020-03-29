import { Time } from '../../../core/EventQueue/EventQueue';
import { formatTime } from '../../../core/utils/time';
import { injectStyle } from '../StyleInjector';

export class FwdWebConsole {
  public readonly htmlElement: HTMLDivElement;

  private _code: HTMLElement;
  private _viewport: HTMLElement;
  private _autoScrollCheckbox: HTMLInputElement;

  public get autoScroll(): boolean {
    return this._autoScrollCheckbox.checked;
  }

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('web-console');

    this.htmlElement.append(
      this.buildConsole(),
      this.buildMenuBar(),
    );
  }

  public clear() {
    this._code.innerHTML = '';
  }

  public print(time: Time, ...messages: any[]) {
    if (time != null) {
      messages = [formatTime(time), ...messages];
    }

    this._code.innerHTML += messages.join(' ');
    this._code.innerHTML += '\n';

    if (this.autoScroll) {
      this._viewport.scrollTop = this._viewport.scrollHeight;
    }    
  }

  private buildConsole(): HTMLPreElement {
    const pre = document.createElement('pre');
    pre.id = 'console-viewport';
    this._viewport = pre;

    this._code = document.createElement('code');
    this._code.id = 'console-code';
    this._code.classList.add('nohighlight');  // That's for highlight.js

    pre.append(this._code);
    return pre;
  }

  private buildMenuBar(): HTMLDivElement {
    const div = document.createElement('div');
    div.classList.add('menubar');
    
    const clearButton = document.createElement('button');
    clearButton.id = 'clear-console'; // TODO: find better way to style
    clearButton.innerText = 'Clear';
    clearButton.onclick = () => { this.clear(); }

    const autoScrollLabel = document.createElement('label');
    autoScrollLabel.innerText = 'Auto-scroll';

    const autoScrollCheckbox = document.createElement('input');
    autoScrollCheckbox.type = 'checkbox';
    autoScrollCheckbox.checked = true;
    this._autoScrollCheckbox = autoScrollCheckbox;

    autoScrollLabel.prepend(autoScrollCheckbox);
    div.append(clearButton, autoScrollLabel);
    return div;
  }
}

injectStyle('WebConsole', `
.web-console {
  flex-grow: 1;
  color: rgb(0, 0, 0);
  background: rgba(0, 0, 0, 0.02);
  box-shadow: inset 1px 1px 8px 0px rgba(0, 0, 0, 0.075);
  overflow: auto;
  display: flex;
  flex-direction: column;
  min-height: 70px;
}

.web-console pre {
  flex-grow: 1;
  overflow: auto;
  margin: 0;
}

.web-console code {
  flex-grow: 1;
  display: flex;
  padding: 3px 10px;
}

.web-console .menubar {
  background: rgba(0, 0, 0, 0.02);
  border-top: #00000010 1px solid;
}

.web-console .menubar button {
  padding: 2px 4px;
  margin: 4px 8px;
}
`);