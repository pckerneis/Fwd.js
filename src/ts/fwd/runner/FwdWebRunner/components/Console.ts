import { Time } from '../../../core/EventQueue/EventQueue';
import { formatTime } from '../../../core/utils/time';

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