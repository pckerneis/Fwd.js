import { injectStyle } from "../StyleInjector";

type WriteMode = 'insert' | 'overwrite';

export class TextArea {
  public readonly htmlElement: HTMLDivElement;

  private readonly editableDiv: HTMLDivElement;

  private _textContent: string = '';
  private _mode: WriteMode;
  private _maxLength: number = Infinity;
  private readonly _caretContainer: HTMLDivElement;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('text-area');

    this.editableDiv = document.createElement('div');
    this.editableDiv.classList.add('text-area-editable');
    this.editableDiv.contentEditable = 'true';
    this.editableDiv.spellcheck = false;
    this.htmlElement.append(this.editableDiv);

    // TODO: implement multiline overwrite mode
    // Block new spaces in overwrite mode
    this.editableDiv.onkeypress = (event: KeyboardEvent) => {
      if (this._mode === 'overwrite' &&
          (event.code === 'Enter' || event.code === 'NumpadEnter')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    this.editableDiv.oninput = (event: InputEvent) => {
      this._textContent = this.editableDiv.firstChild.textContent;

      if (event.inputType === 'insertText') {
        if (this._mode === 'overwrite') {
          this.performOverwrite(event.data);
          event.preventDefault();
          event.stopPropagation();
        } else {
          this.performInsert(event.data);
        }
      }
    };

    ['mouseup', 'mousedown', 'mousemove', 'keyup', 'keydown', 'focus']
      .forEach(event => this.editableDiv.addEventListener(event, () => {
        setTimeout(() => this.putCaretAtEndOfSelection());
      }));

    this._caretContainer = document.createElement('div');
    this._caretContainer.classList.add('text-area-caret-container');

    this.addCaret(0);
  }
  
  private static getSelectionRange(): {start: number, end: number} {
    const selection = getSelection();
    return {
      start: selection.anchorOffset - 1,
      end: selection.focusOffset,
    }
  }

  public set maxLength(newMaxLength: number) {
    this._maxLength = newMaxLength;
    this.setContentWithMaxLengthKeepingSelection(this._textContent);
  }

  public set mode(newMode: WriteMode) {
    // support non type-checked assignation
    if (newMode === 'overwrite') {
      this._mode = 'overwrite';
      this.editableDiv.classList.add('overwrite-mode');
    } else {
      this._mode = 'insert';
      this.editableDiv.classList.remove('overwrite-mode');
    }
  }

  public get mode(): WriteMode {
    return this._mode;
  }

  public get value(): string {
    return this._textContent;
  }

  public set value(newValue: string) {
    this.setTextUnconstrained(this.constrainLength(newValue));
    this.putCaretAtEndOfSelection();
  }

  private performOverwrite(newChar: string): void {
    const selectionRange = TextArea.getSelectionRange();
    const preSelection = this._textContent.substring(0, selectionRange.start);
    const postCaret = this._textContent.substring(selectionRange.end + 1);

    const newText = this.constrainLength(preSelection + newChar + postCaret);
    this.setTextUnconstrained(newText);

    const caretPosition = Math.min(newText.length, preSelection.length + 1);
    this.setSelectionRange(caretPosition, caretPosition);
    this.addCaret(caretPosition);
  }

  private performInsert(newChar: string): void {
    const selectionRange = TextArea.getSelectionRange();
    const preSelection = this._textContent.substring(0, selectionRange.start);
    const postSelection = this._textContent.substring(selectionRange.end);

    const newText = this.constrainLength(preSelection + newChar + postSelection);
    this.setTextUnconstrained(newText);

    const caretPosition = Math.min(newText.length, preSelection.length + 1);
    this.setSelectionRange(caretPosition, caretPosition);
  }

  private setContentWithMaxLengthKeepingSelection(newContent: string): void {
    const selectionRange = TextArea.getSelectionRange();
    this.setTextUnconstrained(this.constrainLength(newContent));

    if (this._textContent.length > 0) {
      const rangeStart = Math.min(this._textContent.length, selectionRange.start);
      const rangeEnd = Math.min(this._textContent.length, selectionRange.end);
      this.setSelectionRange(rangeStart, rangeEnd);
      this.addCaret(rangeEnd);
    } else {
      this.addCaret(0);
    }
  }
  
  private constrainLength(text: string): string {
    if (! isNaN(this._maxLength) && this._maxLength >= 0) {
      return text.substring(0, this._maxLength) || '';
    } else {
      return text;
    }
  }

  private setSelectionRange(start: number, end: number): void {
    const range = document.createRange();
    range.selectNode(this.editableDiv);
    range.setStart(this.editableDiv.firstChild, start);
    range.setEnd(this.editableDiv.firstChild, end);

    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private setTextUnconstrained(newContent: string): void {
    this.editableDiv.innerText = newContent;
    this._textContent = newContent;
    this.editableDiv.append(this._caretContainer);
  }

  private addCaret(position: number): void {
    this._caretContainer.innerHTML = '';

    const preCaret = document.createElement('span');
    preCaret.innerText = Array(position).fill('_').join('');
    preCaret.style.visibility = 'hidden';

    const caret = document.createElement('span');
    caret.innerText = '_';
    caret.classList.add('text-area-caret');

    if (position === this._maxLength) {
      caret.classList.add('reached-end');
    }

    this._caretContainer.append(preCaret, caret);
  }

  private putCaretAtEndOfSelection(): void {
    const selectionRange = TextArea.getSelectionRange();
    const caretPosition = Math.max(selectionRange.start + 1, selectionRange.end);
    this.addCaret(caretPosition);
  }
}

injectStyle('TextArea', `
.text-area {
  padding: 0;
  box-sizing: border-box;
}

.text-area-editable {
  width: 100%;
  height: 100%;
  padding: 2px 5px;
  box-sizing: border-box;
  position: relative;
}

.text-area-caret-container {
  color: transparent;
  pointer-events: none;
  user-select: none;
  position: absolute;
  top: 2px;
  left: 5px;
  right: 5px;
  bottom: 2px;
}

.text-area-caret {
  width: 7px;
  height: 1em;
  background: #4677ff47;
  
  visibility: hidden;
  pointer-events: none;
}

.text-area-caret.reached-end {
  background: #ff000080;
}

.text-area-editable.overwrite-mode:focus .text-area-caret {
  visibility: visible;
}
`);