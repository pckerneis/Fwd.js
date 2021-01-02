import { RootComponentHolder } from './RootComponentHolder';

export interface ComponentPosition {
  x: number,
  y: number,
}

export interface IBounds {
  x: number,
  y: number,
  width: number,
  height: number,
}

export class ComponentBounds implements IBounds {
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    this.x = Math.ceil(x);
    this.y = Math.ceil(y);
    this.width = Math.ceil(width);
    this.height = Math.ceil(height);
  }

  public static fromIBounds(bounds: IBounds): ComponentBounds {
    if (! Boolean(bounds)) {
      return new ComponentBounds();
    }

    return new ComponentBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  public get topLeft(): ComponentPosition {
    return {
      x: this.x,
      y: this.y,
    }
  }

  public get center(): ComponentPosition {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    }
  }

  public asIBounds(): IBounds {
    return { x: this.x, y: this.y, height: this.height, width: this.width };
  }

  public clone(): ComponentBounds {
    return new ComponentBounds(this.x, this.y, this.width, this.height);
  }

  public removeFromLeft(amount: number): ComponentBounds {
    amount = Math.floor(Math.max(0, Math.min(amount, this.width)));

    const removed = new ComponentBounds(this.x, this.y, amount, this.height);

    this.x += amount;
    this.width -= amount;

    return removed;
  }

  public removeFromTop(amount: number): ComponentBounds {
    amount = Math.floor(Math.max(0, Math.min(amount, this.height)));

    const removed = new ComponentBounds(this.x, this.y, this.width, amount);

    this.y += amount;
    this.height -= amount;

    return removed;
  }

  public removeFromBottom(amount: number): ComponentBounds {
    amount = Math.floor(Math.max(0, Math.min(amount, this.height)));

    const removed = new ComponentBounds(this.x, this.height - amount, this.width, amount);

    this.height -= amount;

    return removed;
  }

  public translated(offset: ComponentPosition): ComponentBounds {
    return new ComponentBounds(
      this.x + offset.x,
      this.y + offset.y,
      this.width, this.height);
  }

  public withX(x: number): ComponentBounds {
    return this.translated({ x, y: 0 });
  }

  public withWidth(width: number): ComponentBounds {
    return ComponentBounds.fromIBounds({ ...this.asIBounds(), width });
  }

  public withHeight(height: number): ComponentBounds {
    return ComponentBounds.fromIBounds({ ...this.asIBounds(), height });
  }

  public withY(y: number): ComponentBounds {
    return this.translated({ x: 0, y });
  }

  public withTrimmedLeft(amount: number): ComponentBounds {
    return this.withX(amount).withWidth(this.width - amount);
  }

  public withTrimmedTop(amount: number): ComponentBounds {
    return this.withY(amount).withHeight(this.height - amount);
  }
}

export interface IComponentMouseEvent {
  nativeEvent: MouseEvent;
  isDragging: boolean;
  positionAtMouseDown: ComponentPosition,
  position: ComponentPosition,
  pressedComponent: Component,
  wasDragged: boolean,
  modifiers: { shift: boolean, option: boolean }
}

export class ComponentMouseEvent implements IComponentMouseEvent {
  public readonly isDragging: boolean;
  public readonly modifiers: { shift: boolean; option: boolean };
  public readonly nativeEvent: MouseEvent;
  public readonly position: ComponentPosition;
  public readonly positionAtMouseDown: ComponentPosition;
  public readonly pressedComponent: Component;
  public readonly wasDragged: boolean;

  constructor(infos: IComponentMouseEvent) {
    this.isDragging = infos.isDragging;
    this.modifiers = infos.modifiers;
    this.nativeEvent = infos.nativeEvent;
    this.position = infos.position;
    this.positionAtMouseDown = infos.positionAtMouseDown;
    this.pressedComponent = infos.pressedComponent;
    this.wasDragged = infos.wasDragged;
  }

  public getDragOffset(): ComponentPosition {
    return {
      x: this.position.x - this.positionAtMouseDown.x,
      y: this.position.y - this.positionAtMouseDown.y,
    };
  }

  public consumeNativeEvent(): void {
    this.nativeEvent.stopPropagation();
    this.nativeEvent.preventDefault();
  }
}

/**
 * A node in a canvas-based component tree.
 */
export abstract class Component {

  private _children: Component[] = [];
  private _parent: Component = null;
  private _visible: boolean = true;
  private _needRepaint: boolean = true;
  private _rootHolder: RootComponentHolder<this>;
  private _hovered: boolean;
  private _mouseCursor: string;
  private _beingDragged: boolean;
  private _cachedCanvas: HTMLCanvasElement;
  private _interceptsMouseEvents: boolean = true;

  protected constructor(private _bounds: ComponentBounds = new ComponentBounds()) {
  }

  public static boundsIntersect(box1: IBounds, box2: IBounds): boolean {
    return ! ((box2.x >= box1.x + box1.width) || (box2.x + box2.width <= box1.x)
      || (box2.y >= box1.y + box1.height) || (box2.y + box2.height <= box1.y));
  }

  private static createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  public get mouseCursor(): string {
    return this._mouseCursor;
  }

  public set mouseCursor(cursor: string) {
    this._mouseCursor = cursor;

    if (this.hovered || this._beingDragged) {
      document.body.style.cursor = this._mouseCursor;
    }
  }

  public get hovered(): boolean {
    return this._hovered;
  }

  public get width(): number {
    return Math.ceil(this._bounds.width);
  }

  public set width(newWidth: number) {
    if (newWidth != this._bounds.width) {
      this._bounds.width = newWidth;
    }
  }

  public get height(): number {
    return Math.ceil(this._bounds.height);
  }

  public set height(newHeight: number) {
    if (newHeight != this._bounds.height) {
      this._bounds.height = newHeight;
    }
  }

  public set rootHolder(holder: RootComponentHolder<this>) {
    this._rootHolder = holder;
  }

  public getParentComponent(): Component {
    return this._parent;
  }

  public hasParentComponent(): boolean {
    return this._parent != null;
  }

  public addAndMakeVisible(childComp: Component): void {
    if (childComp._parent != null) {
      throw new Error('A component cannot be added to multiple parents. ' +
        'You first need to remove it from its previous parent');
    }

    childComp._visible = true;
    this._children.push(childComp);
    childComp._parent = this;
  }

  public removeChild(childComp: Component): void {
    const idx = this._children.indexOf(childComp);

    if (idx >= 0) {
      childComp._visible = false;
      childComp._parent = null;
      this._children.splice(idx, 1);
    }
  }

  public getPosition(): ComponentPosition {
    let x = this._bounds.x;
    let y = this._bounds.y;
    let parent = this._parent;

    while (parent != undefined) {
      x += parent._bounds.x;
      y += parent._bounds.y;
      parent = parent._parent;
    }

    return {x, y};
  }

  public getLocalBounds(): ComponentBounds {
    return new ComponentBounds(0, 0, this.width, this.height);
  }

  public getBounds(): ComponentBounds {
    return this._bounds.clone();
  }

  public setBounds(newBounds: ComponentBounds): void {
    this._bounds = newBounds;
    this.resized();
  }

  public toFront(): void {
    if (this._parent == null) {
      return;
    }

    const idx = this._parent._children.indexOf(this);

    if (idx < 0)
      return;

    this._parent._children.splice(idx, 1);
    this._parent._children.push(this);
  }

  public hitTest(mousePosition: ComponentPosition): boolean {
    if (! this._visible)
      return false;

    return isPointInRectangle(mousePosition, this.getAbsoluteBounds());
  }

  public findInterceptingComponentAt(position: ComponentPosition): Component {
    for (let i = this._children.length; --i >= 0;) {
      const c = this._children[i];

      if (c._interceptsMouseEvents && c.hitTest(position)) {
        return c.findInterceptingComponentAt(position);
      }
    }

    return this;
  }

  public repaintNow(): void {
    this.repaint(true, true);
  }

  public repaint(isOriginalRepaintTarget: boolean = true,
                 shouldRepaintRightNow: boolean = false): void {
    this._needRepaint = true;

    // Mark all children so that they will repaint
    this._children.forEach(child => child.repaint(false, false));

    if (isOriginalRepaintTarget) {
      if (shouldRepaintRightNow) {
        this.repaintFromRoot();
      } else {
        setTimeout(() => this.repaintFromRoot());
      }
    }
  }

  // Mouse events

  public setInterceptsMouseEvents(shouldIntercept: boolean): void {
    this._interceptsMouseEvents = shouldIntercept;
  }

  public mouseMoved(event: ComponentMouseEvent): void {
    this._beingDragged = event.isDragging && event.pressedComponent === this;
  }

  public mouseEnter(event: ComponentMouseEvent): void {
    if (event.isDragging) {
      this._hovered = event.pressedComponent === this;
    } else {
      this._hovered = true;
    }

    if (this._hovered) {
      document.body.style.cursor = this.mouseCursor;
    }
  }

  public mouseExit(event: ComponentMouseEvent): void {
    if (event.isDragging) {
      this._hovered = event.pressedComponent === this;
    } else {
      this._hovered = false;
    }
  }

  public mousePressed(event: ComponentMouseEvent): void {
  }

  public mouseReleased(event: ComponentMouseEvent): void {
  }

  public mouseDragged(event: ComponentMouseEvent): void {
  }

  public clicked(event: ComponentMouseEvent): void {
  }

  public doublePressed(event: ComponentMouseEvent): void {
  }

  public doubleClicked(event: ComponentMouseEvent): void {
  }

  // Resizing and rendering

  protected abstract resized(): void;

  protected abstract render(g: CanvasRenderingContext2D): void;

  /**
   * Renders this component and its children on a canvas rendering context. This method shouldn't be used directly and
   * 'repaint' should be used instead when the component needs to be re-rendered.
   *
   * @param context the canvas context to use
   */
  private paint(context: CanvasRenderingContext2D): void {
    if (this._visible
      && Math.floor(this._bounds.width) > 0
      && Math.floor(this._bounds.height) > 0) {
      let g: HTMLCanvasElement;
      
      if (this._needRepaint || this._cachedCanvas == null) {
        g = Component.createOffscreenCanvas(Math.ceil(this._bounds.width), Math.ceil(this._bounds.height));
        this.render(g.getContext('2d'));
        this._cachedCanvas = g;
      } else {
        g = this._cachedCanvas;
      }

      const bounds = this.getAbsoluteBounds();
      context.drawImage(g, Math.floor(bounds.x), Math.floor(bounds.y));
    }

    this._children.forEach(child => child.paint(context));

    this._needRepaint = false;
  }

  private getAbsoluteBounds(): ComponentBounds {
    let offset: ComponentPosition = {
      x: 0, y: 0,
    };

    let parent = this.getParentComponent();

    while (parent != null) {
      offset.x += parent.getPosition().x;
      offset.y += parent.getPosition().y;
      parent = parent.getParentComponent();
    }

    return this.getBounds().translated(offset);
  }

  private repaintFromRoot(): void {
    // Find root component
    let root: Component = this;

    while (root._parent != null) {
      root = root._parent;
    }

    // Render
    if (root._rootHolder != null) {
      root.paint(root._rootHolder.renderingContext);
    }
  }
}

export function isPointInRectangle(point: ComponentPosition, rect: IBounds | ComponentBounds): boolean {
  if (point.x < rect.x || point.x > rect.x + rect.width) {
    return false;
  }

  return ! (point.y < rect.y || point.y > rect.y + rect.height);
}
