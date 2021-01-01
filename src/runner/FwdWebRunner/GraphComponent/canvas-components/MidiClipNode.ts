import { filter } from 'rxjs/operators';
import { ComponentBounds, ComponentMouseEvent } from '../../canvas/BaseComponent';
import FwdWebRunner from '../../FwdWebRunner';
import { MidiClipNodeService } from '../../services/midi-clip-node.service';
import { MidiFlagState } from '../../state/project.state';
import { GraphNode } from './GraphNode';
import { GraphRoot } from './GraphRoot';

export class MidiClipNode extends GraphNode {
  protected readonly defaultHeight: number = 30;
  private labelHeight: number = 18;

  private _flags: MidiFlagState[] = [];

  constructor(parentGraph: GraphRoot,
              public readonly midiClipNodeService: MidiClipNodeService) {
    super(parentGraph);

    this.midiClipNodeService.flags$
      .pipe(filter(() => this.hasParentComponent()))
      .subscribe((flags) => {
        this.updateFlags(flags);
      });

    this.midiClipNodeService.label$.subscribe((newLabel) => {
      this.label = newLabel;
    });
  }

  public updateFlags(updatedFlags: MidiFlagState[]): void {
    if (this._flags.length != updatedFlags.length) {
      this.clearPins();

      updatedFlags.forEach(f => {
        switch (f.kind) {
          case 'inlet':
            this.addInlet();
            break;
          case 'outlet':
            this.addOutlet();
            break;
        }
      });
    }

    this._flags = updatedFlags;
    this.repaint();
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

    this.resized();
    this.refreshParent();
  }
}
