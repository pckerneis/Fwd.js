import { injectStyle } from '../../../../runner/FwdWebRunner/StyleInjector';
import { clamp } from '../../../utils/numbers';
import audit from '../../../utils/time-filters/audit';
import { EditorElement } from '../EditorElement';

interface FlexItemOptions {
  minHeight?: number,
  maxHeight?: number,
  height?: number,
  minWidth?: number,
  maxWidth?: number,
  width?: number,
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
  container: HTMLElement;
}

export class FlexPanel implements EditorElement {
  public readonly htmlElement: HTMLDivElement;
  private _elementStack: FlexItem[] = [];
  private _separators: SeparatorElement[] = [];

  constructor(private _direction: FlexDirection = 'row') {
    this.htmlElement = document.createElement('div');
    this.htmlElement.classList.add(FLEX_PANEL_CLASS);
    this.htmlElement.style.flexDirection = _direction;
    this.setAlignment('start');
  }

  public addFlexItem(element: EditorElement, flexItemOptions: FlexItemOptions): EditorElement {
    const container = document.createElement('div');
    container.append(element.htmlElement);
    container.classList.add(WRAPPER_CLASS);
    this.htmlElement.append(container);

    // Default values
    container.style.position = 'relative';

    if (this.isVerticalAlignment()) {
      container.style.overflowX = 'auto';
      container.style.overflowY = 'hidden';
    } else {
      container.style.overflowX = 'hidden';
      container.style.overflowY = 'auto';
    }

    if (flexItemOptions) {
      const affectIfNotNull = (property: string, suffix: string = '') => {
        if (flexItemOptions[property] != null && property in container.style) {
          container.style[property] = flexItemOptions[property] + suffix;
        }
      };

      ['height', 'width', 'minHeight', 'maxHeight', 'minWidth', 'maxWidth'].forEach(key => affectIfNotNull(key, 'px'));
    }

    const newItem = {
      element,
      container,
      flexItemOptions,
    };

    this._elementStack.push(newItem);

    const containerBounds = container.getBoundingClientRect();

    const getDesiredOrDefault = (options: FlexItemOptions) =>
      this.isVerticalAlignment() ?
        (options.height || options.minHeight || containerBounds.height) :
        (options.width || options.minWidth || containerBounds.width);

    const desiredSize = getDesiredOrDefault(flexItemOptions);
    for (const e of this._elementStack) {
      this.setDesiredSize(e, e === newItem ? desiredSize :
        getDesiredOrDefault(e.flexItemOptions));
    }

    return element;
  }

  public setAlignment(alignment: 'start' | 'end'): void {
    this.htmlElement.classList.add(alignment);
    this.htmlElement.classList.remove(alignment === 'start' ? 'end' : 'start');
  }

  public addSeparator(draggable?: boolean): SeparatorElement {
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
    const item = this._elementStack[separator.index];

    const sizeAtMouseDown = vertical ?
      item.container.getBoundingClientRect().height
      : item.container.getBoundingClientRect().width;

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
      const desiredSize = sizeAtMouseDown - diff;

      this.setDesiredSize(item, desiredSize);
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

  private setDesiredSize(item: FlexItem, desiredSize: number): void {
    const vertical = this.isVerticalAlignment();

    // Determine max size based on space left available by other elements
    const otherMinSize = this._elementStack
      .map((item) => item.flexItemOptions[vertical ? 'minHeight' : 'minWidth'])
      .reduce((prev, curr) => prev + curr, 0) - item.flexItemOptions[vertical ? 'minHeight' : 'minWidth'];

    const separatorsSize = this._separators
      .map(sep => sep.htmlElement.getBoundingClientRect()[vertical ? 'height' : 'width'])
      .reduce((pre, curr) => pre + curr, 0);

    const computedMaxSize = this.htmlElement.getBoundingClientRect()[vertical ? 'height' : 'width']
      - otherMinSize
      - separatorsSize;

    let newSize = clamp(desiredSize,
      vertical ? item.flexItemOptions.minHeight : item.flexItemOptions.minWidth,
      vertical ? item.flexItemOptions.maxHeight : item.flexItemOptions.maxWidth);

    if (vertical) {
      newSize = clamp(newSize, item.flexItemOptions.minHeight, item.flexItemOptions.maxHeight);
      newSize = Math.min(newSize, computedMaxSize);
      item.container.style.height = newSize + 'px';
    } else {
      newSize = clamp(newSize, item.flexItemOptions.minWidth, item.flexItemOptions.maxWidth);
      newSize = Math.min(newSize, computedMaxSize);
      item.container.style.width = newSize + 'px';
    }
  }
}

const FLEX_PANEL_CLASS = 'fwd-runner-flex-panel';
const WRAPPER_CLASS = 'fwd-runner-flex-wrapper';

injectStyle('FlexPanel', `
.fwd-flex-panel-separator {
  background: rgb(247, 248, 249);
  flex-shrink: 0;
  flex-grow: 0;
}

.fwd-flex-panel-separator.draggable:hover {
  background: #00000010;
}

.${FLEX_PANEL_CLASS} {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.${WRAPPER_CLASS} {
  display: flex;
}

.${FLEX_PANEL_CLASS} > .${WRAPPER_CLASS} {
  flex-grow: 0;
  flex-shrink: 0;
}

.${FLEX_PANEL_CLASS}.end > .${WRAPPER_CLASS}:first-child {
  flex-grow: 1;
  flex-shrink: 1;
}

.${FLEX_PANEL_CLASS}.start > .${WRAPPER_CLASS}:last-child {
  flex-grow: 1;
  flex-shrink: 1;
}
`);
