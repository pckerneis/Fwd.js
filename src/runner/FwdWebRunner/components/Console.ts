import { clamp } from "../../../utils/numbers";
import { formatTime } from '../../../utils/time';
import { injectStyle } from '../StyleInjector';
import { IconButton } from "./IconButton";

const defaultHeight = 120;
const minHeight = 50;
const maxHeight = 400;

export class FwdWebConsole {
  public readonly htmlElement: HTMLDivElement;

  private _code: HTMLElement;
  private _viewport: HTMLElement;
  private _autoScrollCheckbox: HTMLInputElement;
  private _replInput: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('web-console');

    this.htmlElement.append(
      this.buildMenuBar(),
      this.buildConsole(),
      this.buildEvaluateSection(),
    );
  }

  public get autoScroll(): boolean {
    return this._autoScrollCheckbox.checked;
  }

  public clear(): void {
    this._code.innerHTML = '';
  }

  public print(time: number, ...messages: any[]): void {
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

    pre.append(this._code);

    return pre;
  }

  private buildMenuBar(): HTMLDivElement {
    const div = document.createElement('div');
    div.classList.add('web-console-menubar');

    const clearButton = new IconButton('bin');
    clearButton.htmlElement.onclick = () => this.clear();
    clearButton.htmlElement.onmousedown = (event) => event.stopPropagation();

    const autoScrollLabel = document.createElement('label');
    autoScrollLabel.innerText = 'Auto-scroll';
    autoScrollLabel.onmousedown = (event) => event.stopPropagation();

    const autoScrollCheckbox = document.createElement('input');
    autoScrollCheckbox.type = 'checkbox';
    autoScrollCheckbox.checked = true;
    this._autoScrollCheckbox = autoScrollCheckbox;

    autoScrollLabel.prepend(autoScrollCheckbox);
    div.append(clearButton.htmlElement, autoScrollLabel);

    div.onmousedown = (event) => this.startDrag(event);

    return div;
  }

  private buildEvaluateSection(): HTMLElement {
    const replRow = document.createElement('div');
    replRow.classList.add('web-console-repl-row');

    this._replInput = document.createElement('div');
    this._replInput.classList.add('web-console-repl-input');
    this._replInput.contentEditable = 'true';
    this._replInput.spellcheck = false;

    const rightChevron = document.createElement('object');
    rightChevron.type = 'image/svg+xml';
    rightChevron.data = `img/right-chevron.svg`;
    rightChevron.classList.add('web-console-repl-chevron');

    replRow.append(rightChevron, this._replInput);

    this._replInput.addEventListener('keypress', (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        this.print(null, '> ' + this._replInput.innerText);

        try {
          Function(this._replInput.innerText)();
        } catch(e) {
          console.error(e);
        }

        this._replInput.innerText = '';
      }
    });

    return replRow;
  }

  private startDrag(event: MouseEvent): void {
    let mouseYAtPosDown = event.clientY;
    let heightAtMouseDown = this.htmlElement.getBoundingClientRect().height;

    const mouseDragHandler = (evt: MouseEvent) => {
      const diff = mouseYAtPosDown - evt.clientY;
      const newHeight = clamp(heightAtMouseDown + diff, minHeight, maxHeight);
      this.htmlElement.style.height = newHeight + 'px';
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseDragHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseDragHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }
}

injectStyle('WebConsole', `
.web-console {
  flex-grow: 1;
  background: rgb(247, 248, 249);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: ${defaultHeight}px;
}

.web-console pre {
  background: rgba(0, 0, 0, 0.02);
  flex-grow: 1;
  overflow: auto;
  margin: 0;
}

.web-console code {
  flex-grow: 1;
  display: flex;
  padding-left: 20px;
}

.web-console .web-console-menubar {
  border-bottom: #00000010 1px solid;
  height: 27px;
  cursor: ns-resize;
  user-select: none;
  font-size: 11px;
}

.web-console .web-console-menubar label {
  display: inline-flex;
  align-items: center;
}

.web-console-repl-input {
  flex-grow: 1;
  font-family: monospace;
  outline: none;
  margin: auto;
}

.web-console-repl-row {
  border-top: #00000010 1px solid;
  height: 20px;
  display: flex;
  background: rgba(0, 0, 0, 0.02);
}

.web-console-repl-chevron {
  height: 100%;
  padding: 5px;
  opacity: 0.5;
}
`);
