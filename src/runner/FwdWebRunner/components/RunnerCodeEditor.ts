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
import FwdWebRunner from '../FwdWebRunner';
import { injectStyle } from '../StyleInjector';
import { IconButton } from './IconButton';

export class RunnerCodeEditor {
  public readonly htmlElement: HTMLElement;
  public readonly codeMirror: CodeMirror.Editor;

  private _buildButton: IconButton;
  private _autoBuildInput: HTMLInputElement;
  private _saveButton: IconButton;

  constructor(public readonly runner: FwdWebRunner) {
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

    this.htmlElement.prepend(
      this.buildToolbar(),
    );
  }


  public set code(newCode: string) {
    this.codeMirror.setValue(newCode);
  }

  public get code(): string {
    return this.codeMirror.getValue();
  }

  public refresh(): void {
    this.codeMirror.refresh();
  }

  private buildToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.classList.add('fwd-code-editor-toolbar');

    this._autoBuildInput = document.createElement('input');
    this._autoBuildInput.type = 'checkbox';

    const autoBuildLabel = document.createElement('label');
    autoBuildLabel.classList.add('fwd-runner-auto-build-label');
    autoBuildLabel.innerText = 'Auto-save';
    autoBuildLabel.append(this._autoBuildInput);

    const spacer = document.createElement('span');
    spacer.style.flexGrow = '1';

    this._saveButton = new IconButton('save');
    this._buildButton = new IconButton('tools');

    toolbar.append(
      spacer,
      autoBuildLabel,
      this._saveButton.htmlElement,
      // this._buildButton.htmlElement,
    );

    this._autoBuildInput.oninput = () => this.runner.setAutoSave(this._autoBuildInput.checked);
    this._buildButton.htmlElement.onclick = () => this.runner.build();
    this._saveButton.htmlElement.onclick = () => this.runner.save();

    return toolbar;
  }
}

injectStyle('RunnerCodeEditor', `
.fwd-code-editor-toolbar {
  display: flex;
  width: 100%;
  height: 27px;
  background: rgb(247, 248, 249);
  border-bottom: solid 1px #00000020;
  user-select: none;
  flex-shrink: 0;
}

.fwd-code-editor-cm {
  width: 100%;
  flex-grow: 1;
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
