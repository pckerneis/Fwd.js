import { injectStyle } from "../../../../runner/FwdWebRunner/StyleInjector";
import { clamp } from "../../../utils/numbers";
import audit from "../../../utils/time-filters/audit";
import { EditorElement } from "../../FwdEditor";

abstract class AbstractContainerElement implements EditorElement {
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

export class ContainerPanel extends AbstractContainerElement {
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
  display?: string,
  flexDirection?: string,
}

export class SeparatorElement implements EditorElement {
  public readonly htmlElement: HTMLElement;

  private _separatorSize: number = 6;

  constructor(public readonly direction: FlexDirection, public readonly index: number, draggable: boolean) {
    const separator = document.createElement('div');
    separator.classList.add('fwd-flex-panel-separator');

    if (draggable) {
      separator.classList.add('draggable');
      separator.style.cursor = this.direction === 'row' ? 'ew-resize' : separator.style.cursor = 'ns-resize';
    }

    this.htmlElement = separator;

    this.separatorSize = 6;
  }

  public set separatorSize(size: number) {
    this._separatorSize = size;

    if (this.direction === 'row') {
      this.htmlElement.style.width = this._separatorSize + 'px';
    } else {
      this.htmlElement.style.height = this._separatorSize + 'px';
    }
  }

  public get separatorSize(): number {
    return this._separatorSize;
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
    element.htmlElement.style.position = 'relative';

    if (flexItemOptions) {
      const affectIfNotNull = (property: string, suffix: string = '') => {
        if (flexItemOptions[property] != null && property in element.htmlElement.style) {
          element.htmlElement.style[property] = flexItemOptions[property] + suffix;
        }
      };

      ['height', 'width', 'minHeight', 'maxHeight', 'minWidth', 'maxWidth'].forEach(key => affectIfNotNull(key, 'px'));
      ['flexGrow', 'flexShrink', 'display', 'flexDirection'].forEach(key => affectIfNotNull(key));
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

  public addSeparator(index: number, draggable?: boolean): SeparatorElement {
    if (this.getSeparatorWithIndex(index) != null) {
      // TODO: find a nice way to 'soft' re-add separators
      // throw new Error(`There\'s already a separator with the index ${index}.`);
      return;
    }

    const separator = this.createSeparatorElement(this._elementStack.length - 1, draggable);
    this.htmlElement.append(separator.htmlElement);
    this._separators.push(separator);

    if (draggable) {
      separator.htmlElement.onmousedown = (event) => this.startDrag(event, separator);
    }

    return separator;
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

    const containerPosAtMouseDown = vertical ?
      this.htmlElement.getBoundingClientRect().top
      : this.htmlElement.getBoundingClientRect().left;

    const mouseDragHandler = audit((evt: MouseEvent) => {
      // In case we've lost the mouse up event (out of browser window)
      if (evt.buttons === 0) {
        document.removeEventListener('mousemove', mouseDragHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        return;
      }

      getSelection().removeAllRanges();

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
    });

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
  background: rgb(247, 248, 249);
  flex-shrink: 0;
  flex-grow: 0;
}

.fwd-flex-panel-separator.draggable:hover {
  background: #00000010;
}
`);


