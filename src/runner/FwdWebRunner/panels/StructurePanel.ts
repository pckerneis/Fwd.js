import { EditorElement } from '../../../fwd/editor/elements/EditorElement';
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
  border-right: 1px lightgrey solid;
  border-left: 1px lightgrey solid;
}
`);
