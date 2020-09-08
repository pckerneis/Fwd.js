import CodeMirror from 'codemirror';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/hint/javascript-hint';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/match-highlighter';
import 'codemirror/addon/search/matchesonscrollbar';
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
    this.htmlElement.classList.add('fwd-code-editor-container');

    this.codeMirror = CodeMirror(this.htmlElement, {
      lineNumbers: true,
      mode: 'javascript',
      tabSize: 2,
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      matchBrackets: true,
      autoCloseBrackets: true,
      highlightSelectionMatches: {showToken: /\w/, annotateScrollbar: true},
    });

    // Add extra css class to CM root
    this.htmlElement.children[0].classList.add('fwd-code-editor-cm');

    // Define 'save' command
    CodeMirror.commands['save'] = () => this.submit();

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
    autoBuildLabel.innerText = 'Auto-run';
    autoBuildLabel.append(this._autoBuildInput);

    const spacer = document.createElement('span');
    spacer.style.flexGrow = '1';

    this._saveButton = new IconButton(this.runner.config.writeToFile ? 'save' : 'enter');
    this._saveButton.htmlElement.title = this.runner.config.writeToFile ? 'Save' : 'Run';

    toolbar.append(
      spacer,
      autoBuildLabel,
      this._saveButton.htmlElement,
    );

    this._autoBuildInput.oninput = () => this.runner.setAutoSave(this._autoBuildInput.checked);
    this._saveButton.htmlElement.onclick = () => this.submit();

    return toolbar;
  }

  private submit(): void {
    this.runner.submit();
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

.fwd-code-editor-container:focus-within {
  border: 1px solid #2388ff;
}

.fwd-code-editor-container {
  border: 1px solid #fff;
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
