import { Point, Points, Rectangle } from './Rectangle';
import { RootComponentHolder } from './RootComponentHolder';

export interface IComponentMouseEvent {
  nativeEvent: MouseEvent;
  isDragging: boolean;
  positionAtMouseDown: Point,
  position: Point,
  pressedComponent: Component,
  wasDragged: boolean,
  modifiers: { shift: boolean, option: boolean }
}

export class ComponentMouseEvent implements IComponentMouseEvent {
  public readonly isDragging: boolean;
  public readonly modifiers: { shift: boolean; option: boolean };
  public readonly nativeEvent: MouseEvent;
  public readonly position: Point;
  public readonly positionAtMouseDown: Point;
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

  public getDragOffset(): Point {
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
  private _viewOffset: Point = Points.origin();

  protected constructor(private _bounds: Rectangle = new Rectangle()) {
  }

  protected static createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
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

  public getPosition(): Point {
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

  public getLocalBounds(): Rectangle {
    return new Rectangle(0, 0, this.width, this.height);
  }

  public getBounds(): Rectangle {
    return this._bounds.clone();
  }

  public setBounds(newBounds: Rectangle): void {
    this._bounds = newBounds;
    this.resized();
  }

  public getViewOffset(): Point {
    return this._viewOffset;
  }

  public setViewOffset(offset: Point): void {
    this._viewOffset = offset;
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

  public hitTest(mousePosition: Point): boolean {
    if (! this._visible)
      return false;

    return this.getAbsoluteBounds().contains(mousePosition);
  }

  public findInterceptingComponentAt(position: Point): Component {
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

  private getAbsoluteBounds(): Rectangle {
    let offset: Point = {
      x: 0, y: 0,
    };

    let parent = this.getParentComponent();

    while (parent != null) {
      offset.x += parent.getPosition().x + parent.getViewOffset().x;
      offset.y += parent.getPosition().y + parent.getViewOffset().y;
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
