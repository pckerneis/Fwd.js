import { injectStyle } from "../StyleInjector";

type WriteMode = 'insert' | 'overwrite';

export class TextArea {
  public readonly htmlElement: HTMLDivElement;

  private readonly editableDiv: HTMLDivElement;

  private _textContent: string = '';
  private _mode: WriteMode;
  private _maxLength: number = Infinity;

  constructor() {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add('text-area');

    this.editableDiv = document.createElement('div');
    this.editableDiv.classList.add('text-area-editable');
    this.editableDiv.contentEditable = 'true';
    this.editableDiv.spellcheck = false;
    this.htmlElement.append(this.editableDiv);

    this.editableDiv.oninput = (event: InputEvent) => {
      this._textContent = this.editableDiv.textContent;

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
    } else {
      this._mode = 'insert';
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
  }

  private performOverwrite(newChar: string): void {
    const selectionRange = TextArea.getSelectionRange();
    const preSelection = this._textContent.substring(0, selectionRange.start);
    const postCaret = this._textContent.substring(selectionRange.end + 1);

    const newText = this.constrainLength(preSelection + newChar + postCaret);
    this.setTextUnconstrained(newText);

    const caretPosition = Math.min(newText.length, preSelection.length + 1);
    this.setSelectionRange(caretPosition, caretPosition);

    const caret = document.createElement('div');
    caret.classList.add('text-area-caret');
    this.editableDiv.append(caret);
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
  }
}

injectStyle('TextArea', `
.text-area {
  position: relative;
  padding: 0;
  box-sizing: border-box;
}

.text-area-editable {
  width: 100%;
  height: 100%;
  padding: 2px 5px;
    box-sizing: border-box;
}

.text-area-caret {
    width: 8px;
    height: 18px;
    background: #4677ff47;
    position: absolute;
    top: 1px;
    border: 1px solid #00000036;
    left: 3px;
    
    visibility: hidden;
    pointer-events: none;
}

.text-area-editable:focus .text-area-caret {
  _visibility: visible;
}
`);