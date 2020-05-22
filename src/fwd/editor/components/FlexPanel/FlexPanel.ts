import { clamp } from "../../../core/utils/numbers";
import { injectStyle } from "../../../runner/FwdWebRunner/StyleInjector";
import { EditorElement } from "../../api/Editor";

abstract class EditorContainer implements EditorElement {
  public abstract htmlElement: HTMLDivElement;

  public elements: Map<string, EditorElement>;

  protected constructor() {
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
  flexGrow?: number,
  flexShrink?: number,
}

class SeparatorElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  private separatorSize: number = 6;

  constructor(public readonly direction: FlexDirection, public readonly index: number, draggable: boolean) {
    const separator = document.createElement('div');
    separator.classList.add('fwd-flex-panel-separator');

    if (this.direction === 'row') {
      separator.style.width = this.separatorSize + 'px';
    } else {
      separator.style.height = this.separatorSize + 'px';
    }

    if (draggable) {
      separator.classList.add('draggable');
      separator.style.cursor = this.direction === 'row' ? 'ew-resize' : separator.style.cursor = 'ns-resize';
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
  private _separators: SeparatorElement[] = [];

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

    // Default values
    element.htmlElement.style.overflow = 'hidden';

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
      if (flexItemOptions.flexGrow != null)
        element.htmlElement.style.flexGrow = flexItemOptions.flexGrow.toString();
      if (flexItemOptions.flexShrink != null)
        element.htmlElement.style.flexShrink = flexItemOptions.flexShrink.toString();
    }

    this._elementStack.push({
      element,
      flexItemOptions,
    });

    return element;
  }

  public getOrAddFlexItem(key: string,
                          elementFactory: () => EditorElement,
                          flexItemOptions: FlexItemOptions): EditorElement {
    return this.get(key) || this.addFlexItem(key, elementFactory(), flexItemOptions);
  }

  public addSeparator(draggable?: boolean): void {
    const index = this._elementStack.length - 1;

    if (this.getSeparatorWithIndex(index) != null) {
      throw new Error(`There\'s already a separator with the index ${index}.`);
    }

    const separator = this.createSeparatorElement(this._elementStack.length - 1, draggable);
    this.htmlElement.append(separator.htmlElement);
    this._separators.push(separator);

    if (draggable) {
      separator.htmlElement.onmousedown = (event) => this.startDrag(event, separator);
    }
  }

  private createSeparatorElement(index: number, draggable: boolean): SeparatorElement {
    return new SeparatorElement(this._direction, index, draggable);
  }

  private startDrag(event: MouseEvent, separator: SeparatorElement): void {
    // Dragging while having something selected in the dom leads to weird behaviours
    getSelection().removeAllRanges();

    const vertical = this.isVerticalAlignment();
    const mouseDownPos = vertical ? event.clientY : event.clientX;
    const { flexItemOptions, element } = this._elementStack[separator.index];

    const sizeAtMouseDown = vertical ?
      element.htmlElement.getBoundingClientRect().height
      : element.htmlElement.getBoundingClientRect().width;

    console.log('sizeAtMouseDown', sizeAtMouseDown);

    const containerPosAtMouseDown = vertical ?
      this.htmlElement.getBoundingClientRect().top
      : this.htmlElement.getBoundingClientRect().left;

    const mouseDragHandler = (evt: MouseEvent) => {
      // In case we've lost the mouse up event (out of browser window)
      if (evt.buttons === 0) {
        document.removeEventListener('mousemove', mouseDragHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        return;
      }

      const containerPos = vertical ?
        this.htmlElement.getBoundingClientRect().top
        : this.htmlElement.getBoundingClientRect().left;

      const containerOffset = Math.min(0, containerPos - containerPosAtMouseDown);

      const diff = mouseDownPos - (vertical ? evt.clientY : evt.clientX) + containerOffset;
      let newSize = clamp(sizeAtMouseDown - diff,
        vertical ? flexItemOptions.minHeight : flexItemOptions.minWidth,
        vertical ? flexItemOptions.maxHeight : flexItemOptions.maxWidth);

      if (vertical) {
        element.htmlElement.style.height = newSize + 'px';
        newSize = Math.max(element.htmlElement.getBoundingClientRect().height, newSize);
        element.htmlElement.style.height = newSize + 'px';
      } else {
        element.htmlElement.style.width = newSize + 'px';
        newSize = Math.max(element.htmlElement.getBoundingClientRect().width, newSize);
        element.htmlElement.style.width = newSize + 'px';
      }

      console.log('newSize', newSize);
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

  private getSeparatorWithIndex(index: number): SeparatorElement {
    const results = this._separators.filter(sep => sep.index === index);
    return results[0];
  }
}

injectStyle('FlexPanel', `
.fwd-flex-panel-separator {
  background: #0000000a;
  flex-shrink: 0;
  flex-grow: 0;
}

.fwd-flex-panel-separator.draggable:hover {
  background: #00000010;
}
`);


