import CodeMirror from 'codemirror';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/hint/javascript-hint';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/search/search';
import 'codemirror/addon/search/searchcursor';
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
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      matchBrackets: true,
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

  public refresh(): void {
    this.codeMirror.refresh();
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

.CodeMirror-dialog-top {
  position: absolute;
  top: 0;
  background: #fdfdfd;
  z-index: 1000;
  box-shadow: 0px 1px 4px 0px #00000045;
  width: 100%;
  padding: 2px 4px;
}
`);
