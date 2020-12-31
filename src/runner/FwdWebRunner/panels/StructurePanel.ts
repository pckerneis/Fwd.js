import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
import { defaultTheme } from '../../style.constants';
import { injectStyle } from '../StyleInjector';

export class StructurePanel implements EditorElement {
  public readonly htmlElement: HTMLElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(PANEL_CLASS);
  }
}

const PANEL_CLASS = 'fwd-runner-structure-panel';

injectStyle('StructurePanel', `
.${PANEL_CLASS} {
  flex-grow: 1;
  background-color: ${defaultTheme.bgSecondary};
}
`);
