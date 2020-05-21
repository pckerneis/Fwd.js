import { ContainerPanel } from "../components/FlexPanel/FlexPanel";

export interface EditorElement {
  htmlElement?: HTMLElement;
}

export class Editor {
  public readonly root: ContainerPanel;

  constructor() {
    this.root = new ContainerPanel();
  }
}
