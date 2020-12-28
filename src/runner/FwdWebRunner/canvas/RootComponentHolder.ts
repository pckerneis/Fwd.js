import { squaredDistance } from '../NoteSequencer/canvas-components/RenderHelpers';
import { Component, ComponentBounds, ComponentMouseEvent, ComponentPosition } from './BaseComponent';

declare class ResizeObserver {
  constructor(...args: any[]);
  public observe(element: HTMLElement, options?: any): any;
  public disconnect(): any;
}

const CLICK_MAX_DISTANCE_SQUARED = 30;
const CLICK_INTERVAL = 200;
const DOUBLE_CLICK_INTERVAL = 500;
const DOUBLE_PRESS_INTERVAL = 400;

export class RootComponentHolder<T extends Component> {
  public readonly canvas: HTMLCanvasElement;

  private canvasMouseDownListener: (event: MouseEvent) => void;
  private documentMouseUpListener: (event: MouseEvent) => void;
  private documentMouseMoveListener: (event: MouseEvent) => void;
  private _resizeObserver: ResizeObserver;

  constructor(public readonly width: number, public readonly height: number, public readonly rootComponent: T) {
    rootComponent.rootHolder = this;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    this.initMouseEventListeners();
  }

  public get renderingContext(): CanvasRenderingContext2D {
    return this.canvas.getContext('2d');
  }

  public repaint(): void {
    this.rootComponent.repaint();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.rootComponent.setBounds(new ComponentBounds(0, 0, width, height));
  }

  public initMouseEventListeners(): void {
    let pressedComponent: Component = null;
    let componentUnderMouse: Component = null;
    let mouseDownPos: ComponentPosition;
    let mouseUpPos: ComponentPosition;
    let mouseDownTime: number;
    let mouseUpTime: number;
    let consecutiveClickCount: number = 0;
    let consecutivePressCount: number = 0;
    let lastClickTime: number;
    let lastClickPos: ComponentPosition;
    let wasDragged: boolean = false;
    let isDragging: boolean = false;

    const mousePositionRelativeToCanvas = (event: MouseEvent) => {
      const canvasBounds = this.canvas.getBoundingClientRect();
      const x = event.clientX - canvasBounds.x;
      const y = event.clientY - canvasBounds.y;
      return {x, y};
    };

    const hit = (event: MouseEvent, action: (hit: Component) => void) => {
      const mousePos = mousePositionRelativeToCanvas(event);
      const hitComponent = this.rootComponent.findComponentAt(mousePos);

      if (hitComponent != null) {
        action(hitComponent);
      }
    };

    this.canvasMouseDownListener = (mouseEvent) => hit(mouseEvent, (component) => {
      pressedComponent = component;
      mouseDownPos = mousePositionRelativeToCanvas(mouseEvent);
      mouseDownTime = performance.now();
      wasDragged = false;
      isDragging = true;

      component.mousePressed({
        nativeEvent: mouseEvent,
        position: mouseDownPos,
        positionAtMouseDown: mouseDownPos,
        pressedComponent: component,
        wasDragged,
        modifiers: extractModifiers(mouseEvent),
        isDragging,
      });

      if (lastClickPos == null
        || lastClickTime == null
        || mouseDownTime > lastClickTime + DOUBLE_PRESS_INTERVAL
        || squaredDistance(lastClickPos.x, lastClickPos.y, mouseDownPos.x, mouseDownPos.y) > CLICK_MAX_DISTANCE_SQUARED) {
        consecutivePressCount = 1;
      } else {
        consecutivePressCount++;
      }

      if (consecutivePressCount == 2) {
        component.doublePressed({
          nativeEvent: mouseEvent,
          position: mouseDownPos,
          positionAtMouseDown: mouseDownPos,
          pressedComponent: component,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });

        consecutivePressCount = 0;
      }
    });

    this.documentMouseUpListener = (mouseEvent: MouseEvent) => {
      mouseUpPos = mousePositionRelativeToCanvas(mouseEvent);
      mouseUpTime = performance.now();

      if (pressedComponent != null) {
        pressedComponent.mouseReleased({
          nativeEvent: mouseEvent,
          position: mouseUpPos,
          positionAtMouseDown: mouseDownPos,
          pressedComponent,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });

        if (mouseUpTime < mouseDownTime + CLICK_INTERVAL
          && ! wasDragged) {
          lastClickPos = mouseUpPos;

          pressedComponent.clicked({
            nativeEvent: mouseEvent,
            position: mouseUpPos,
            positionAtMouseDown: mouseDownPos,
            pressedComponent,
            wasDragged,
            modifiers: extractModifiers(mouseEvent),
            isDragging,
          });

          if (lastClickTime == null || mouseUpTime > lastClickTime + DOUBLE_CLICK_INTERVAL) {
            consecutiveClickCount = 1;
          } else {
            consecutiveClickCount++;
          }

          if (consecutiveClickCount == 2
            && ! wasDragged) {
            pressedComponent.doubleClicked({
              nativeEvent: mouseEvent,
              position: mouseUpPos,
              positionAtMouseDown: mouseDownPos,
              pressedComponent,
              wasDragged,
              modifiers: extractModifiers(mouseEvent),
              isDragging,
            });

            consecutiveClickCount = 0;
          }
        }

        pressedComponent = null;
        lastClickTime = performance.now();
      }

      wasDragged = false;
      isDragging = false;
    };

    this.documentMouseMoveListener = (mouseEvent: MouseEvent) => {
      const {x, y} = mousePositionRelativeToCanvas(mouseEvent);

      if (! wasDragged
        && mouseDownPos != null
        && squaredDistance(mouseDownPos.x, mouseDownPos.y, x, y) > CLICK_MAX_DISTANCE_SQUARED) {
        wasDragged = true;
      }

      hit(mouseEvent, (component) => {
        document.body.style.cursor = component.mouseCursor || 'default';

        if (componentUnderMouse != null && componentUnderMouse != component) {
          const event: ComponentMouseEvent = {
            nativeEvent: mouseEvent,
            position: {x, y},
            positionAtMouseDown: mouseDownPos,
            wasDragged,
            modifiers: extractModifiers(mouseEvent),
            pressedComponent,
            isDragging,
          };

          componentUnderMouse.mouseExit({...event});
          component.mouseEnter({...event});
        }

        componentUnderMouse = component;

        component.mouseMoved({
          nativeEvent: mouseEvent,
          position: {x, y},
          positionAtMouseDown: mouseDownPos,
          pressedComponent: component,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });
      });

      if (mouseEvent.buttons > 0 && pressedComponent != null) {
        document.body.style.cursor = pressedComponent.mouseCursor;

        pressedComponent.mouseDragged({
          nativeEvent: mouseEvent,
          position: {x, y},
          positionAtMouseDown: mouseDownPos,
          pressedComponent,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });
      }
    };
  }

  public attachMouseEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.canvasMouseDownListener);
    document.addEventListener('mouseup', this.documentMouseUpListener);
    document.addEventListener('mousemove', this.documentMouseMoveListener);
  }

  public removeMouseEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.canvasMouseDownListener);
    document.removeEventListener('mouseup', this.documentMouseUpListener);
    document.removeEventListener('mousemove', this.documentMouseMoveListener);
  }

  public attachResizeObserver(elementToObserve: HTMLElement): void {
    if (this._resizeObserver != null) {
      this.removeResizeObserver();
    }

    const resizeObserver = new ResizeObserver(() => this.resizeAndDraw(elementToObserve));
    resizeObserver.observe(elementToObserve);
    this._resizeObserver = resizeObserver;
  }

  public removeResizeObserver(): void {
    if (this._resizeObserver != null) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  private resizeAndDraw(containerElement: HTMLElement): void {
    const boundingClientRect = containerElement.getBoundingClientRect();
    this.resize(Math.ceil(boundingClientRect.width), Math.ceil(boundingClientRect.height));
    this.repaint();
  }
}

function extractModifiers(mouseEvent: MouseEvent): { shift: boolean, option: boolean } {
  return {
    shift: mouseEvent.shiftKey,
    option: mouseEvent.ctrlKey,
  }
}
