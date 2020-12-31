import { ArrayList } from '../../../../fwd/utils/arraylist';
import { Component, ComponentBounds, ComponentMouseEvent } from '../../canvas/BaseComponent';
import FwdWebRunner from '../../FwdWebRunner';
import { TimeSignature } from '../../NoteSequencer/note-sequencer';
import { ObservableState } from '../../state/observable-state';
import { MidiClipNodeState, MidiFlagState, NodeState } from '../../state/project.state';
import { GraphRoot } from './GraphRoot';
import { InletPin, OutletPin, Pin } from './Pin';

export abstract class GraphNode<T extends NodeState = NodeState> extends Component {

  public readonly inlets: ArrayList<InletPin> = new ArrayList<InletPin>();
  public readonly outlets: ArrayList<OutletPin> = new ArrayList<OutletPin>();

  protected backgroundColor: string = '#eeeeee';
  protected borderColor: string = '#444444';
  protected labelColor: string = '#333333';

  protected labelFontSize: number = 13;
  protected pinHeight: number = 15;
  protected pinWidth: number = 7;
  protected readonly defaultHeight: number = 24;
  protected readonly defaultWidth: number = 120;

  protected readonly _state: T;
  protected readonly _stateObserver: ObservableState<T>;

  private _boundsAtMouseDown: ComponentBounds;

  protected constructor(public readonly parentGraph: GraphRoot) {
    super();

    this.width = this.defaultWidth;
    this.height = this.defaultHeight;

    this._state = this.getInitialState();
    this._stateObserver = new ObservableState<T>(this._state);
  }

  public get state(): T {
    return this._state;
  }

  public get label(): string {
    return this._state.label;
  }

  public set label(newLabel: string) {
    if (this._state.label != newLabel) {
      console.log({newLabel});
      this._state.label = newLabel;
      this._stateObserver.changed('label');
      this.repaint();
    }
  }

  public abstract getInitialState(): T;

  public observeLabel(callback: (value: string) => void): void {
    this._stateObserver.observe(callback, 'label');
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

export class InitNode extends GraphNode<NodeState> {
  constructor(parentGraph: GraphRoot) {
    super(parentGraph);

    this.addOutlet();
    this.label = 'init';
  }

  public getInitialState(): NodeState {
    return {
      bounds: undefined,
      flags: [],
      id: '',
      kind: 'MidiClip',
      label: '',
      notes: [],
      duration: 0,
      timeSignature: {upper: 4, lower: 4},
    };
  }
}

let latestId = 0;

export class MidiClipNode extends GraphNode<MidiClipNodeState> {
  public readonly id: any;

  protected readonly defaultHeight: number = 30;
  private labelHeight: number = 18;

  constructor(parentGraph: GraphRoot) {
    super(parentGraph);

    this.addMidiInlet(0, 'in');
    this.addMidiOutlet(16, 'out');

    this.id = ++latestId;
    this.duration = 16;

    this.observeFlags(() => this.repaint());
  }

  public set duration(duration: number) {
    this._state.duration = duration;
    this._stateObserver.changed('duration');
  }

  public get duration(): number {
    return this._state.duration;
  }

  public set signature(signature: TimeSignature) {
    this._state.timeSignature = signature;
    this._stateObserver.changed('timeSignature');
  }

  public get signature(): TimeSignature {
    return this._state.timeSignature;
  }

  public observeDuration(cb: (newDuration: number) => any): void {
    this._stateObserver.observe(cb, 'duration');
  }

  public setSignatureUpper(newValue: number): any {
    if (this.signature.upper !== newValue) {
      this._state.timeSignature.upper = newValue;
      this._stateObserver.changed('timeSignature');
    }
  }

  public setSignatureLower(newValue: number): any {
    if (this.signature.lower !== newValue) {
      this._state.timeSignature.lower = newValue;
      this._stateObserver.changed('timeSignature');
    }
  }

  public observeSignatureLower(cb: (newSignLower: number) => any): void {
    this._stateObserver.observe((sign) => cb(sign.lower), 'timeSignature');
  }

  public observeSignatureUpper(cb: (newSignLower: number) => any): void {
    this._stateObserver.observe((sign) => cb(sign.upper), 'timeSignature');
  }

  public updateFlags(updatedFlags: MidiFlagState[]): void {
    this._stateObserver.update(updatedFlags, 'flags');
  }

  public observeFlags(cb: (newFlags: MidiFlagState[]) => any): void {
    this._stateObserver.observe(cb, 'flags');
  }

  public getInitialState(): NodeState {
    return {
      bounds: undefined,
      flags: [],
      id: '',
      kind: 'MidiClip',
      label: '',
      notes: [],
      duration: 0,
      timeSignature: {upper: 4, lower: 4},
    };
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    const pm = FwdWebRunner.sharedServices.panelManager;
    pm.showMidiEditor(this);
  }

  public addMidiInlet(time: number, name: string): void {
    this.addInlet();
    this._state.flags.push({ name, time, color: 'grey', kind: 'inlet' });
    this._stateObserver.changed('flags');
  }

  public addMidiOutlet(time: number, name: string): void {
    this.addOutlet();
    this._state.flags.push({ name, time, color: 'grey', kind: 'outlet' });
    this._stateObserver.changed('flags');
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

    const midiInlets = this._state.flags.filter(flag => flag.kind === 'inlet');

    const inletOffsetY = this.labelHeight +
      (availableHeight - midiInlets.length * this.pinHeight) / 2;

    midiInlets.forEach((inlet, index) => {
      g.fillText(inlet.name, this.pinWidth, inletOffsetY + index * this.pinHeight, this.width / 0.6);
    });

    g.textAlign = 'right';

    const midiOutlets = this._state.flags.filter(flag => flag.kind === 'outlet');

    const outletOffsetY = this.labelHeight +
      (availableHeight - midiOutlets.length * this.pinHeight) / 2;

    midiOutlets.forEach((outlet, index) => {
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
