import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentBounds, ComponentMouseEvent } from '../../canvas/BaseComponent';
import { InletPin, OutletPin } from './Pin';

export class GraphNode extends Component {

  public label: string;

  private _boundsAtMouseDown: ComponentBounds;

  private readonly inlets: ArrayList<InletPin> = new ArrayList<InletPin>()
  private readonly outlets: ArrayList<OutletPin> = new ArrayList<OutletPin>()
  private readonly defaultHeight: number = 24;
  private pinHeight: number = 15;

  constructor() {
    super();
  }

  public addInlet(): void {
    const pin = new InletPin();
    this.addAndMakeVisible(pin);
    this.inlets.add(pin);
    this.adaptSizeToPins();
  }

  public addOutlet(): void {
    const pin = new OutletPin();
    this.addAndMakeVisible(pin);
    this.outlets.add(pin);
    this.adaptSizeToPins();
  }
  
  public adaptSizeToPins(): void {
    this.height = Math.max(this.defaultHeight,
      this.inlets.size() * this.pinHeight,
      this.outlets.size() * this.pinHeight);
  }

  public mousePressed(event: ComponentMouseEvent): void {
    this._boundsAtMouseDown = this.getBounds();
    this.toFront();
    this.refreshParent();
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    const targetBounds = this._boundsAtMouseDown.translated(event.getDragOffset());
    targetBounds.x = Math.max(0, targetBounds.x);
    targetBounds.y = Math.max(0, targetBounds.y);
    this.setBounds(targetBounds);
    this.refreshParent();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = 'white';
    g.fillRect(0, 0, this.width, this.height);

    g.strokeStyle = '#333333';
    g.lineWidth = 1;
    g.strokeRect(0, 0, this.width, this.height);

    if (this.label != null) {
      g.font = '15px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#333333';

      const allowedWidth = this.width - 16;
      const fullLabelWidth = g.measureText(this.label).width;
      let textToRender = this.label;

      if (fullLabelWidth > allowedWidth) {
        textToRender = this.label.slice(0, this.label.length * (allowedWidth / fullLabelWidth)) + '…';
      }

      g.fillText(textToRender, this.width / 2, this.height / 2, allowedWidth);
      console.log(textToRender);
    }
  }

  protected resized(): void {
    const inletOffsetY = (this.height - this.inlets.size() * this.pinHeight) / 2;

    this.inlets.array.forEach((pin, index) => {
      pin.setBounds(new ComponentBounds(0, inletOffsetY + this.pinHeight * index,
        this.pinHeight, this.pinHeight));
    });

    const outletOffsetY = (this.height - this.outlets.size() * this.pinHeight) / 2;

    this.outlets.array.forEach((pin, index) => {
      pin.setBounds(new ComponentBounds(this.width - this.pinHeight,
        outletOffsetY + this.pinHeight * index,
        this.pinHeight, this.pinHeight));
    });
  }

  private refreshParent(): void {
    if (this.getParentComponent() != null) {
      this.getParentComponent().repaint();
    }
  }
}
