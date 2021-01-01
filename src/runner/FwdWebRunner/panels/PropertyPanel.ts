import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { darkTheme, defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';

export class PropertyPanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('fwd-property-panel');
  }

  public addTitle(text: string): HTMLElement {
    const e = document.createElement('b');
    e.innerText = text;
    e.style.gridColumn = '1 / span 2';
    e.style.userSelect = 'none';
    this.htmlElement.append(e);
    return e;
  }

  public addLabel(text: string): HTMLSpanElement {
    const e = document.createElement('span');
    e.innerText = text;
    e.style.userSelect = 'none';
    this.htmlElement.append(e);
    return e;
  }

  public addNumberInput(defaultValue: number, min?: number, max?: number): HTMLInputElement {
    const e = this.createNumberInput(defaultValue, min, max);
    this.htmlElement.append(e);
    return e;
  }

  public addTextInput(defaultValue: string): HTMLInputElement {
    const e = document.createElement('input');
    e.type = 'text';
    e.value = defaultValue;
    this.htmlElement.append(e);
    return e;
  }

  public addTextButton(text: string, clickHandler: Function): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.gridColumn = '1 / span 2';
    btn.classList.add('text-button');
    btn.innerText = 'Render';
    btn.onclick = () => clickHandler();
    this.htmlElement.append(btn);
    return btn;
  }


  public addSelect(options: string[], defaultValue: string, changeHandler: (value: string) => void): HTMLSelectElement {
    const e = this.createSelect(options, defaultValue, changeHandler);
    this.htmlElement.append(e);
    return e;
  }

  public createSelect(options: string[], defaultValue: string, changeHandler: (value: string) => void): HTMLSelectElement {
    const select = document.createElement('select');

    options.forEach((value) => {
      const elem = document.createElement('option');
      elem.value = value;
      elem.innerText = value;
      select.append(elem);
    });

    select.value = defaultValue;

    select.oninput = () => {
      changeHandler(options[select.selectedIndex]);
    };

    return select;
  }

  public createNumberInput(defaultValue: number, min?: number, max?: number): HTMLInputElement {
    const e = document.createElement('input');
    e.type = 'number';
    e.value = defaultValue.toString();
    if (! isNaN(min)) e.min = min.toString();
    if (! isNaN(max)) e.max = max.toString();
    return e;
  }
}

injectStyle('PropertyPanel', `
.fwd-property-panel {
  padding: 0 8px;
  background: ${defaultTheme.bgSecondary};
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1.5rem;
  grid-gap: 2px;
  align-items: center;
  font-size: 12px;
}

.fwd-property-panel>input {
  width: 100%;
}

.fwd-property-panel>select {
  width: 100%;
}

.fwd-runner-dark-mode .fwd-property-panel {
  background: ${darkTheme.bgSecondary};
  border-left: none;
}

.fwd-property-panel * {
  display: block;
}

.fwd-runner-dark-mode .text-button {
  background: ${darkTheme.bgPrimary};
  color: ${darkTheme.textColor};
  border: 1px solid ${darkTheme.textColor};
  border-radius: 2px;
}
`);
