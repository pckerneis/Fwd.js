import { ContainerPanel } from "./elements/FlexPanel/FlexPanel";

export interface EditorElement {
  htmlElement?: HTMLElement;
}

export class Editor {
  public readonly root: ContainerPanel;

  constructor() {
    this.root = new ContainerPanel();
  }

  public reset(): void {
    this.root.htmlElement.innerHTML = '';
    this.root.elements.clear();
  }
}
