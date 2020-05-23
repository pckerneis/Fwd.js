import { TextArea } from "../../../runner/FwdWebRunner/components/TextArea";
import { EditorElement } from "../../Editor";

export type WriteMode = 'insert' | 'overwrite';

export class TextEditorElement implements EditorElement {
  public readonly htmlElement: HTMLElement;
  public readonly textArea: TextArea;

  constructor() {
    this.textArea = new TextArea();
    this.textArea.htmlElement.classList.add('text-editor-controller');
    this.htmlElement = this.textArea.htmlElement;
  }

  public get mode(): WriteMode {
    return this.textArea.mode;
  }

  public set mode(mode: WriteMode) {
    this.textArea.mode = mode;
  }

  public get maxLength(): number {
    return this.textArea.maxLength;
  }

  public set maxLength(maxLength: number) {
    this.textArea.maxLength = maxLength;
  }

  public get textContent(): string {
    return this.textArea.value;
  }

  public set textContent(value: string) {
    this.textArea.value = value;
  }
}
