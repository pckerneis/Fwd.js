import { clamp } from "../../../core/utils/numbers";
import { injectStyle } from "../../../runner/FwdWebRunner/StyleInjector";
import { EditorElement } from "../../api/Editor";

abstract class EditorContainer implements EditorElement {
  public abstract htmlElement: HTMLDivElement;

  public elements: Map<string, EditorElement>;

  constructor() {
    this.elements = new Map<string, EditorElement>();
  }

  public get(key: string): EditorElement {
    return this.elements.get(key);
  }

  protected set(key: string, element: EditorElement): EditorElement {
    this.elements.set(key, element);
    return element;
  }

  protected delete(key: string): EditorElement {
    const elem = this.get(key);
    this.elements.delete(key);
    return elem;
  }
}

export class ContainerPanel extends EditorContainer {
  public readonly htmlElement: HTMLDivElement;

  constructor() {
    super();
    this.htmlElement = document.createElement('div');
  }

  public add(key: string, element: EditorElement): EditorElement {
    const existing = this.get(key);

    if (existing != null) {
      console.warn('Element already exists and cannot be added!');
      return null;
    }

    this.set(key, element);
    this.htmlElement.append(element.htmlElement);

    return element;
  }
}

interface FlexItemOptions {
  minHeight?: number,
  maxHeight?: number,
  height?: number,
  minWidth?: number,
  maxWidth?: number,
  width?: number,
}

class SeparatorElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  private separatorSize: number = 8;

  constructor(public readonly direction: FlexDirection, public readonly index: number) {
    const separator = document.createElement('div');
    separator.classList.add('fwd-flex-panel-separator');

    if (this.direction === 'row') {
      separator.style.width = this.separatorSize + 'px';
      separator.style.cursor = 'ew-resize';
    } else {
      separator.style.height = this.separatorSize + 'px';
      separator.style.cursor = 'ns-resize';
    }

    this.htmlElement = separator;
  }
}

export type FlexDirection = 'row' | 'column';

export interface FlexItem {
  flexItemOptions: FlexItemOptions;
  element: EditorElement;
}

export class FlexPanel extends ContainerPanel {
  public readonly htmlElement: HTMLDivElement;
  private _elementStack: FlexItem[] = [];

  constructor(private _direction: FlexDirection = 'row') {
    super();

    this.htmlElement.style.display = 'flex';
    this.htmlElement.style.width = '100%';
    this.htmlElement.style.height = '100%';
    this.htmlElement.style.flexDirection = _direction;
  }

  public addFlexItem(key: string, element: EditorElement, flexItemOptions: FlexItemOptions): EditorElement {
    element = this.add(key, element);

    if (element == null) {
      return element;
    }

    if (flexItemOptions) {
      if (flexItemOptions.height != null)
        element.htmlElement.style.height = flexItemOptions.height + 'px';
      if (flexItemOptions.width != null)
        element.htmlElement.style.width = flexItemOptions.width + 'px';
      if (flexItemOptions.minHeight != null)
        element.htmlElement.style.minHeight = flexItemOptions.minHeight + 'px';
      if (flexItemOptions.minWidth != null)
        element.htmlElement.style.minWidth = flexItemOptions.minWidth + 'px';
      if (flexItemOptions.maxHeight != null)
        element.htmlElement.style.maxHeight = flexItemOptions.maxHeight + 'px';
      if (flexItemOptions.maxWidth != null)
        element.htmlElement.style.maxWidth = flexItemOptions.maxWidth + 'px';
    }

    this._elementStack.push({
      element,
      flexItemOptions,
    });

    this.addSeparator();

    return element;
  }

  public getOrAddFlexItem(key: string,
                          elementFactory: () => EditorElement,
                          flexItemOptions: FlexItemOptions): EditorElement {
    return this.get(key) || this.addFlexItem(key, elementFactory(), flexItemOptions);
  }

  public addSeparator(): void {
    const separator = this.createSeparatorElement(this._elementStack.length - 1);
    this.htmlElement.append(separator.htmlElement);

    separator.htmlElement.onmousedown = (event) => this.startDrag(event, separator);
  }

  private createSeparatorElement(index: number): SeparatorElement {
    return new SeparatorElement(this._direction, index);
  }

  private startDrag(event: MouseEvent, separator: SeparatorElement): void {
    const vertical = this.isVerticalAlignment();
    let mouseDownPos = vertical ? event.clientY : event.clientX;

    const { flexItemOptions, element } = this._elementStack[separator.index];
    const sizeAtMouseDown = vertical ?
      element.htmlElement.getBoundingClientRect().height
      : element.htmlElement.getBoundingClientRect().width;

    const mouseDragHandler = (evt: MouseEvent) => {
      const diff = mouseDownPos - (vertical ? evt.clientY : evt.clientX);
      const newSize = clamp(sizeAtMouseDown - diff,
        vertical ? flexItemOptions.minHeight : flexItemOptions.minWidth,
        vertical ? flexItemOptions.maxHeight : flexItemOptions.maxWidth);

      if (vertical) {
        element.htmlElement.style.height = newSize + 'px';
      } else {
        element.htmlElement.style.width = newSize + 'px';
      }
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseDragHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseDragHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  private isVerticalAlignment(): boolean {
    return this._direction === 'column';
  }
}

injectStyle('FlexPanel', `
.fwd-flex-panel-separator {
  background: #0000000a;
}

.fwd-flex-panel-separator:hover {
  background: #00000010;
}
`);


