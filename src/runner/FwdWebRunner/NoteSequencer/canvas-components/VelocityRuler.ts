import { Component } from '../../canvas/BaseComponent';
import { SequencerDisplayModel } from '../note-sequencer';

export class VelocityRuler extends Component {

  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    this.model.theme.drawVelocityRuler(g, this.width, this.height, this.model.colors);
  }

  protected resized(): void {
  }

}
