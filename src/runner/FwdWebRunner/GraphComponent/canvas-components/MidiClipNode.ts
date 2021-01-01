import { ComponentBounds, ComponentMouseEvent } from '../../canvas/BaseComponent';
import FwdWebRunner from '../../FwdWebRunner';
import { TimeSignature } from '../../NoteSequencer/note-sequencer';
import { ObservableState } from '../../state/observable-state';
import { MidiClipNodeState, MidiFlagState, MidiNoteState, NodeState } from '../../state/project.state';
import { GraphNode } from './GraphNode';
import { GraphRoot } from './GraphRoot';

export class MidiClipNode extends GraphNode {
  protected readonly defaultHeight: number = 30;
  private labelHeight: number = 18;

  constructor(parentGraph: GraphRoot, stateObserver: ObservableState<NodeState>) {
    super(parentGraph, stateObserver);
    this.observeFlags(() => this.repaint());
  }

  public get state(): MidiClipNodeState {
    return this.stateObserver.get() as MidiClipNodeState;
  }

  public get stateObserver(): ObservableState<MidiClipNodeState> {
    return super.stateObserver as ObservableState<MidiClipNodeState>;
  }

  public set stateObserver(newObserver: ObservableState<MidiClipNodeState>) {
    super.stateObserver = newObserver;
  }

  public set notes(notes: MidiNoteState[]) {
    this.state.notes = notes;
    this.stateObserver.changed('notes');
  }

  public set duration(duration: number) {
    this.state.duration = duration;
    this.stateObserver.changed('duration');
  }

  public get duration(): number {
    return this.state.duration;
  }

  public set signature(signature: TimeSignature) {
    this.state.timeSignature = signature;
    this.stateObserver.changed('timeSignature');
  }

  public get signature(): TimeSignature {
    return this.state.timeSignature;
  }

  public observeDuration(cb: (newDuration: number) => any): void {
    this.stateObserver.observe(cb, 'duration');
  }

  public setSignatureUpper(newValue: number): any {
    if (this.signature.upper !== newValue) {
      this.state.timeSignature.upper = newValue;
      this.stateObserver.changed('timeSignature');
    }
  }

  public setSignatureLower(newValue: number): any {
    if (this.signature.lower !== newValue) {
      this.state.timeSignature.lower = newValue;
      this.stateObserver.changed('timeSignature');
    }
  }

  public observeSignatureLower(cb: (newSignLower: number) => any): void {
    this.stateObserver.observe((sign) => cb(sign.lower), 'timeSignature');
  }

  public observeSignatureUpper(cb: (newSignLower: number) => any): void {
    this.stateObserver.observe((sign) => cb(sign.upper), 'timeSignature');
  }

  public updateFlags(updatedFlags: MidiFlagState[]): void {
    this.stateObserver.update(updatedFlags, 'flags');
  }

  public addFlag(newFlag: MidiFlagState): void {
    const updatedFlags = [...this.state.flags, {...newFlag}];
    this.stateObserver.update(updatedFlags, 'flags');
  }

  public observeFlags(cb: (newFlags: MidiFlagState[]) => any): void {
    this.stateObserver.observe(cb, 'flags');
  }

  public observeNotes(cb: (newNotes: MidiNoteState[]) => any): void {
    this.stateObserver.observe(cb, 'notes');
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    const pm = FwdWebRunner.sharedServices.panelManager;
    pm.showMidiEditor(this);
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

    const midiInlets = this.state.flags.filter(flag => flag.kind === 'inlet');

    const inletOffsetY = this.labelHeight +
      (availableHeight - midiInlets.length * this.pinHeight) / 2;

    midiInlets.forEach((inlet, index) => {
      g.fillText(inlet.name, this.pinWidth, inletOffsetY + index * this.pinHeight, this.width / 0.6);
    });

    g.textAlign = 'right';

    const midiOutlets = this.state.flags.filter(flag => flag.kind === 'outlet');

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
