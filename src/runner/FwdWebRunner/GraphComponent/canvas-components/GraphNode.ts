import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentBounds, ComponentMouseEvent } from '../../canvas/BaseComponent';
import FwdWebRunner from '../../FwdWebRunner';
import { GraphRoot } from './GraphRoot';
import { InletPin, OutletPin, Pin } from './Pin';

export class GraphNode extends Component {

  public readonly inlets: ArrayList<InletPin> = new ArrayList<InletPin>()
  public readonly outlets: ArrayList<OutletPin> = new ArrayList<OutletPin>()

  public label: string;

  protected backgroundColor: string = '#eeeeee';
  protected borderColor: string = '#444444';
  protected labelColor: string = '#333333';

  protected labelFontSize: number = 13;
  protected pinHeight: number = 15;
  protected pinWidth: number = 7;
  protected readonly defaultHeight: number = 24;
  protected readonly defaultWidth: number = 120;

  private _boundsAtMouseDown: ComponentBounds;

  constructor(public readonly parentGraph: GraphRoot) {
    super();

    this.width = this.defaultWidth;
    this.height = this.defaultHeight;
  }

  public addInlet(): void {
    const pin = new InletPin(this, this.parentGraph);
    this.addAndMakeVisible(pin);
    this.inlets.add(pin);
    this.adaptSizeToPins();
    this.resized();
  }

  public addOutlet(): void {
    const pin = new OutletPin(this, this.parentGraph);
    this.addAndMakeVisible(pin);
    this.outlets.add(pin);
    this.adaptSizeToPins();
    this.resized();
  }

  public canConnect(inlet: InletPin, outlet: OutletPin): boolean {
    return inlet.parentNode != outlet.parentNode
      && ! this.arePinsConnected(inlet, outlet);
  }

  public mousePressed(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();
    this._boundsAtMouseDown = this.getBounds();
    this.toFront();
    this.refreshParent();
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    event.consumeNativeEvent();
    const targetBounds = this._boundsAtMouseDown.translated(event.getDragOffset());
    targetBounds.x = Math.max(0, targetBounds.x);
    targetBounds.y = Math.max(0, targetBounds.y);
    this.setBounds(targetBounds);
    this.refreshParent();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.backgroundColor;
    g.fillRect(0, 0, this.width, this.height);

    g.strokeStyle = this.borderColor;
    g.lineWidth = 1;
    g.strokeRect(0, 0, this.width, this.height);

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

  protected resized(): void {
    const inletOffsetY = (this.height - this.inlets.size() * this.pinHeight) / 2;

    this.inlets.array.forEach((pin, index) => {
      pin.setBounds(new ComponentBounds(0, inletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });

    const outletOffsetY = (this.height - this.outlets.size() * this.pinHeight) / 2;

    this.outlets.array.forEach((pin, index) => {
      pin.setBounds(new ComponentBounds(this.width - this.pinWidth,
        outletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });
  }

  protected adaptSizeToPins(): void {
    this.height = Math.max(this.defaultHeight,
      this.inlets.size() * this.pinHeight,
      this.outlets.size() * this.pinHeight);
  }

  private refreshParent(): void {
    if (this.getParentComponent() != null) {
      this.getParentComponent().repaint();
    }
  }

  private arePinsConnected(first: Pin, second: Pin): Boolean {
    return this.parentGraph.arePinsConnected(first, second);
  }
}

export class InitNode extends GraphNode {
  constructor(parentGraph: GraphRoot) {
    super(parentGraph);

    this.addOutlet();
    this.label = 'init';
  }
}

export interface MidiInlet {
  time: number;
  name: string;
}

export interface MidiOutlet {
  time: number;
  name: string;
}

export class MidiClipNode extends GraphNode {
  protected readonly defaultHeight: number = 30;
  private labelHeight: number = 18;

  private midiInlets: ArrayList<MidiInlet> = new ArrayList<MidiInlet>();
  private midiOutlets: ArrayList<MidiOutlet> = new ArrayList<MidiOutlet>();

  constructor(parentGraph: GraphRoot) {
    super(parentGraph);

    this.addMidiInlet({name: 'in', time: 0});
    this.addMidiOutlet({name: 'out', time: 4});
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    const pm = FwdWebRunner.sharedServices.panelManager;
    pm.showMidiEditor(this);
  }

  public addMidiInlet(midiInlet: MidiInlet): void {
    this.midiInlets.add(midiInlet);
    this.addInlet();
  }

  public addMidiOutlet(midiOutlet: MidiOutlet): void {
    this.midiOutlets.add(midiOutlet);
    this.addOutlet();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.backgroundColor;
    g.fillRect(0, 0, this.width, this.height);

    g.strokeStyle = this.borderColor;
    g.lineWidth = 1;
    g.strokeRect(0, 0, this.width, this.height);

    if (this.label != null) {
      g.font = '13px monospace';
      g.textAlign = 'left';
      g.textBaseline = 'hanging';
      g.fillStyle = this.labelColor;

      const allowedWidth = this.width - 4;
      const fullLabelWidth = g.measureText(this.label).width;
      let textToRender = this.label;

      if (fullLabelWidth > allowedWidth) {
        textToRender = this.label.slice(0, this.label.length * (allowedWidth / fullLabelWidth)) + '…';
      }

      g.fillText(textToRender, 3, 2, allowedWidth);
    }

    const availableHeight = this.height - this.labelHeight;

    const inletOffsetY = this.labelHeight +
      (availableHeight - this.midiInlets.size() * this.pinHeight) / 2;

    this.midiInlets.array.forEach((inlet, index) => {
      g.fillText(inlet.name, this.pinWidth, inletOffsetY + index * this.pinHeight, this.width / 0.6);
    });

    g.textAlign = 'right';

    const outletOffsetY = this.labelHeight +
      (availableHeight - this.midiOutlets.size() * this.pinHeight) / 2;

    this.midiOutlets.array.forEach((outlet, index) => {
      g.fillText(outlet.name, this.width - this.pinWidth, outletOffsetY + index * this.pinHeight, this.width / 0.6);
    });
  }

  protected resized(): void {
    const availableHeight = this.height - this.labelHeight;

    const inletOffsetY = this.labelHeight +
      (availableHeight - this.inlets.size() * this.pinHeight) / 2;

    this.inlets.array.forEach((pin, index) => {
      pin.setBounds(new ComponentBounds(0, inletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });

    const outletOffsetY = this.labelHeight +
      (availableHeight - this.outlets.size() * this.pinHeight) / 2;

    this.outlets.array.forEach((pin, index) => {
      pin.setBounds(new ComponentBounds(this.width - this.pinWidth,
        outletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });
  }

  protected adaptSizeToPins(): void {
    this.height = Math.max(this.defaultHeight,
      this.inlets.size() * this.pinHeight + this.labelHeight,
      this.outlets.size() * this.pinHeight + this.labelHeight);
  }
}
