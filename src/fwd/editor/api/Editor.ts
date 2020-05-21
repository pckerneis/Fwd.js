export interface Editor {
  root: HTMLElement;
}

export class FwdWebEditor {
  public readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement('div');
  }
}
