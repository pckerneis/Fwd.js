import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { IRectangle, Rectangle } from '../../canvas/Rectangle';
import { InitNodeState, NodeState } from '../../state/project.state';
import { GraphRoot } from './GraphRoot';
import { InletPin, OutletPin, Pin } from './Pin';

export abstract class GraphNode extends Component {

  public readonly id: number;

  public selected: boolean;

  public readonly inlets: ArrayList<InletPin> = new ArrayList<InletPin>();
  public readonly outlets: ArrayList<OutletPin> = new ArrayList<OutletPin>();

  protected _label: string;

  protected backgroundColor: string = '#eeeeee';
  protected borderColor: string = '#444444';
  protected labelColor: string = '#333333';
  protected selectedBorderColor: string = '#00a8ff';

  protected labelFontSize: number = 13;
  protected pinHeight: number = 15;
  protected pinWidth: number = 7;
  protected readonly defaultHeight: number = 24;
  protected readonly defaultWidth: number = 120;

  private _boundsAtMouseDown: Rectangle;
  private _mouseDownResult: boolean;

  protected constructor(public readonly parentGraph: GraphRoot, state: NodeState) {
    super();

    this.id = state.id;
    this.selected = state.selected;
    this.width = this.defaultWidth;
    this.height = this.defaultHeight;
  }

  public get bounds(): IRectangle {
    return this.getBounds().asIBounds();
  }

  public get label(): string {
    return this._label;
  }

  public set label(newLabel: string) {
    if (this._label != newLabel) {
      this._label = newLabel;
      this.repaint();
    }
  }

  public addInlet(id: number): InletPin {
    const pin = new InletPin(this, this.parentGraph, id);
    this.addAndMakeVisible(pin);
    this.inlets.add(pin);
    this.adaptSizeToPins();
    return pin;
  }

  public addOutlet(id: number): OutletPin {
    const pin = new OutletPin(this, this.parentGraph, id);
    this.addAndMakeVisible(pin);
    this.outlets.add(pin);
    this.adaptSizeToPins();
    return pin;
  }

  public clearOutlets(): void {
    this.outlets.array.forEach(pin => this.removeChild(pin));
    this.outlets.clear();
    this.adaptSizeToPins();
  }

  public clearInlets(): void {
    this.inlets.array.forEach(pin => this.removeChild(pin));
    this.inlets.clear();
    this.adaptSizeToPins();
  }

  public canConnect(inlet: InletPin, outlet: OutletPin): boolean {
    return inlet.parentNode != outlet.parentNode
      && ! this.arePinsConnected(inlet, outlet);
  }

  public mousePressed(event: ComponentMouseEvent): void {
    this._mouseDownResult = this.parentGraph.selection.addToSelectionMouseDown(this.id,
      event.modifiers.shift);

    this._boundsAtMouseDown = this.getBounds();
    this.toFront();
    this.refreshParent();
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    super.mouseReleased(event);
    this.parentGraph.resetComponentDragAndNotifyIfDragged(event);
    this.parentGraph.selection.addToSelectionMouseUp(event.wasDragged,
      event.modifiers.shift, this._mouseDownResult);

    this.repaint();
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();
    this.parentGraph.moveSelection(event);
    this.refreshParent();
  }

  protected render(g: CanvasRenderingContext2D): void {
    this.drawBackground(g);

    if (this.label != null) {
      g.font = `${this.labelFontSize}px monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = this.labelColor;

      const allowedWidth = this.width - 16;
      const fullLabelWidth = g.measureText(this.label).width;
      let textToRender = this.label;

      if (fullLabelWidth > allowedWidth) {
        textToRender = this.label.slice(0, this.label.length * (allowedWidth / fullLabelWidth)) + '…';
      }

      g.fillText(textToRender, this.width / 2, this.height / 2, allowedWidth);
    }
  }

  protected drawBackground(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.backgroundColor;
    g.fillRect(0, 0, this.width, this.height);

    g.strokeStyle = this.selected ? this.selectedBorderColor : this.borderColor;
    g.lineWidth = this.selected ? 3 : 1;
    g.strokeRect(0, 0, this.width, this.height);
  }

  protected resized(): void {
    const inletOffsetY = (this.height - this.inlets.size() * this.pinHeight) / 2;

    this.inlets.array.forEach((pin, index) => {
      pin.setBounds(new Rectangle(0, inletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });

    const outletOffsetY = (this.height - this.outlets.size() * this.pinHeight) / 2;

    this.outlets.array.forEach((pin, index) => {
      pin.setBounds(new Rectangle(this.width - this.pinWidth,
        outletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });
  }

  protected adaptSizeToPins(): void {
    this.height = Math.max(this.defaultHeight,
      this.inlets.size() * this.pinHeight,
      this.outlets.size() * this.pinHeight);

    this.resized();
    this.refreshParent();
  }

  protected refreshParent(): void {
    if (this.getParentComponent() != null) {
      this.getParentComponent().repaint();
    }
  }

  private arePinsConnected(first: Pin, second: Pin): Boolean {
    return this.parentGraph.arePinsConnected(first, second);
  }
}

export class InitNode extends GraphNode {
  constructor(parentGraph: GraphRoot, state: InitNodeState) {
    super(parentGraph, state);

    this.addOutlet(state.outletId);
    this.label = state.label;
    this.selected = state.selected;
  }
}
