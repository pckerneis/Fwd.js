import CodeFlask from 'codeflask';
import { injectStyle } from '../../runner/FwdWebRunner/StyleInjector';
import { EditorElement } from '../Editor';

export class CodeEditorElement implements EditorElement {

  public readonly htmlElement: HTMLDivElement;

  public readonly flask: CodeFlask;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('code-editor-container');

    this.flask = new CodeFlask(this.htmlElement, { language: 'js' });
  }

  public get code(): string {
    return this.flask.getCode();
  }

  public set code(newCode: string) {
    this.flask.updateCode(newCode);
  }
}

injectStyle('CodeEditorElement', `
.code-editor-container {
    position: relative;
    width: 100%;
    height: 100%;
}
`);
