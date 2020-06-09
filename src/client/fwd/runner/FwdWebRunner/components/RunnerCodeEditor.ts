import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import { injectStyle } from '../StyleInjector';

export class RunnerCodeEditor {
  public readonly htmlElement: HTMLElement;
  public readonly codeMirror: CodeMirror.Editor;

  constructor() {
    this.htmlElement = document.createElement('div');

    this.codeMirror = CodeMirror(this.htmlElement, {
      lineNumbers: true,
      mode: 'javascript',
      tabSize: 2,
    });

    this.htmlElement.children[0].classList.add('fwd-code-editor-cm');
  }


  public set code(newCode: string) {
    this.codeMirror.setValue(newCode);
    this.codeMirror.getDoc().clearHistory();
  }

  public get code(): string {
    return this.codeMirror.getValue();
  }
}

injectStyle('RunnerCodeEditor', `
.fwd-code-editor-cm {
  width: 100%;
  height: 100%;
}

/* Override CodeMirror style */
.CodeMirror-vscrollbar,
.CodeMirror-hscrollbar {
  outline: none;
}
`);
