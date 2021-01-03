import { map, pluck } from 'rxjs/operators';
import { ComponentMouseEvent } from '../../canvas/BaseComponent';
import { Rectangle } from '../../canvas/Rectangle';
import { PanelManager } from '../../panels/PanelManager';
import { GraphSequencerService } from '../../services/graph-sequencer.service';
import { MidiClipNodeState, MidiFlagState, NodeState } from '../../state/project.state';
import { GraphNode } from './GraphNode';
import { GraphRoot } from './GraphRoot';

export interface MidiInlet {
  id: number;
  time: number;
  name: string;
}

export interface MidiOutlet {
  id: number;
  time: number;
  name: string;
}

export class MidiClipNode extends GraphNode {
  protected readonly defaultHeight: number = 30;
  private labelHeight: number = 18;

  private _flags: MidiFlagState[] = []; // Cached state

  constructor(parentGraph: GraphRoot,
              state: MidiClipNodeState,
              public readonly graphSequencerService: GraphSequencerService,
              public readonly panelManager: PanelManager) {
    super(parentGraph, state);
  }

  public attachObservers(nodeId: number): void {
    const nodeObserver = this.graphSequencerService.observeNode(nodeId);

    nodeObserver.pipe(
      pluck('label'),
    ).subscribe((newLabel: string) => {
      this.label = newLabel;
    });

    nodeObserver
      .pipe(pluck<NodeState, MidiFlagState[]>('flags'))
      .subscribe((flags: MidiFlagState[]) => this.updateFlags(flags));

    nodeObserver.pipe(
      pluck<NodeState, MidiFlagState[]>('flags'),
      map(flags => flags
        .filter(f => f.kind === 'inlet')
        .map(f => ({time: f.time, name: f.name, id: f.id}))),
    ).subscribe((newInlets: MidiInlet[]) => this.updateInlets(newInlets));

    nodeObserver.pipe(
      pluck<NodeState, MidiFlagState[]>('flags'),
      map(flags => flags
        .filter(f => f.kind === 'outlet')
        .map(f => ({time: f.time, name: f.name, id: f.id}))),
    ).subscribe((newOutlets: MidiOutlet[]) => this.updateOutlets(newOutlets));
  }

  public updateFlags(updatedFlags: MidiFlagState[]): void {
    this._flags = [...updatedFlags];
    this.repaint();
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    this.panelManager.showMidiEditor(this);
  }

  protected render(g: CanvasRenderingContext2D): void {
    this.drawBackground(g);

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

    const midiInlets = this._flags.filter(flag => flag.kind === 'inlet');

    const inletOffsetY = this.labelHeight +
      (availableHeight - midiInlets.length * this.pinHeight) / 2;

    midiInlets.forEach((inlet, index) => {
      g.fillText(inlet.name, this.pinWidth, inletOffsetY + index * this.pinHeight, this.width / 0.6);
    });

    g.textAlign = 'right';

    const midiOutlets = this._flags.filter(flag => flag.kind === 'outlet');

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
      pin.setBounds(new Rectangle(0, inletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });

    const outletOffsetY = this.labelHeight +
      (availableHeight - this.outlets.size() * this.pinHeight) / 2;

    this.outlets.array.forEach((pin, index) => {
      pin.setBounds(new Rectangle(this.width - this.pinWidth,
        outletOffsetY + this.pinHeight * index,
        this.pinWidth, this.pinHeight));
    });
  }

  protected adaptSizeToPins(): void {
    this.height = Math.max(this.defaultHeight,
      this.inlets.size() * this.pinHeight + this.labelHeight,
      this.outlets.size() * this.pinHeight + this.labelHeight);

    this.resized();
    this.refreshParent();
  }

  private updateInlets(inlets: MidiInlet[]): void {
    this.clearInlets();
    inlets.forEach(inlet => {
      this.addInlet(inlet.id);
    });
  }

  private updateOutlets(outlets: MidiOutlet[]): void {
    this.clearOutlets();
    outlets.forEach(outlet => {
      this.addOutlet(outlet.id);
    });
  }
}
